// Runs shader effects (the kit's own and the file's, `defineEffect()`) and transitions (`defineTransition()`): each pass
// is a GLSL function the runner wraps in a fragment shader with its params as uniforms, drawn over a full-frame triangle
// with WebGL 2. Passes between the first and the last draw into textures, not the canvas. Where there is no WebGL 2,
// `available` is false and the painter draws without them.
import type { ShaderTexture, ShaderTextures } from "../media/shader-textures";
import type { ShaderPass, TransitionPass } from "../model/shaders";
import type { AnyCanvas, CreateCanvas } from "../types";

type Gl = WebGL2RenderingContext;
type Uniform = { readonly type: "float" | "bool" | "vec2" | "vec3" | "vec4"; readonly value: readonly number[] };

const VERTEX = `#version 300 es
in vec2 position;
uniform float cutcraft_flip;
out vec2 cutcraft_uv;
void main() {
  // uv (0, 0) is the picture's top left, as in CSS.
  cutcraft_uv = vec2((position.x + 1.0) / 2.0, (1.0 - position.y) / 2.0);
  // Into a texture, row 0 is the top, the way an uploaded canvas lies, so the next pass reads it the same way up.
  gl_Position = vec4(position.x, position.y * cutcraft_flip, 0.0, 1.0);
}`;

/** Names the runner gives every shader; a param may not take one. */
const RESERVED = new Set(["image", "original", "from", "to", "resolution", "time", "progress", "position"]);

/** A param as a uniform: a number as a float, a boolean as a bool, 2 to 4 numbers as a vec, `#rgb`/`#rrggbb` as a vec3. */
export function uniformOf(value: unknown): Uniform | null {
  if (typeof value === "number" && Number.isFinite(value)) return { type: "float", value: [value] };
  if (typeof value === "boolean") return { type: "bool", value: [value ? 1 : 0] };
  if (Array.isArray(value) && value.length >= 2 && value.length <= 4 && value.every((v) => typeof v === "number"))
    return { type: `vec${value.length}` as Uniform["type"], value: value as number[] };
  if (typeof value === "string") {
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value)?.[1];
    if (!hex) return null;
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
    return { type: "vec3", value: [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16) / 255) };
  }
  return null;
}

/**
 * The fragment shader around a pass's GLSL function: its inputs, its params as uniforms, and a `main` that calls it. A
 * final pass writes premultiplied colour for the canvas; a pass into a texture writes plain colour, as the next pass
 * reads its `image`.
 */
export function fragmentSource(
  kind: "effect" | "transition",
  source: string,
  params: Readonly<Record<string, unknown>>,
  final = true,
  /** The kind of texture each `"asset:ID"` param names: a 3D table (a LUT) or a 2D picture. */
  textureKind: (ref: string) => "2d" | "3d" | undefined = () => undefined,
): string {
  const uniforms = Object.entries(params)
    .filter(([name]) => /^[A-Za-z_]\w*$/.test(name) && !RESERVED.has(name))
    .map(([name, value]) => {
      const texture = typeof value === "string" ? textureKind(value) : undefined;
      if (texture) return `uniform highp ${texture === "3d" ? "sampler3D" : "sampler2D"} ${name};`;
      const u = uniformOf(value);
      return u ? `uniform ${u.type} ${name};` : null;
    })
    .filter((line): line is string => line !== null);
  const inputs =
    kind === "effect"
      ? "uniform sampler2D image;\nuniform sampler2D original;"
      : "uniform sampler2D from;\nuniform sampler2D to;\nuniform float progress;";
  return `#version 300 es
precision highp float;
${inputs}
uniform vec2 resolution;
uniform float time;
${uniforms.join("\n")}
in vec2 cutcraft_uv;
out vec4 cutcraft_out;
#line 1
${source}
void main() {
  vec4 c = ${kind}(cutcraft_uv);
  cutcraft_out = ${final ? "vec4(c.rgb * c.a, c.a)" : "c"};
}`;
}

/** A texture the size of the frame that a pass draws into. */
interface Target {
  readonly texture: WebGLTexture;
  readonly framebuffer: WebGLFramebuffer;
}

export class ShaderRunner {
  private canvas: AnyCanvas | null = null;
  private gl: Gl | null = null;
  private tried = false;
  private readonly programs = new Map<string, WebGLProgram>();
  /** Textures the pictures are uploaded into, one per input name. */
  private readonly uploads = new Map<string, WebGLTexture>();
  /** Textures between passes; three, so a pass never draws into its `image` or its effect's `original`. */
  private readonly targets: Target[] = [];
  /** The textures of assets (LUTs, images) uploaded, by their loaded data. */
  private readonly assets = new WeakMap<ShaderTexture, WebGLTexture>();
  private blank: AnyCanvas | null = null;

  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly createCanvas: CreateCanvas,
  ) {}

  /** Whether WebGL 2 is there to run shaders. */
  get available(): boolean {
    return this.context() !== null;
  }

  /**
   * The effects run in order over `source`, each through its passes; the result is the runner's own canvas, valid
   * until its next run. A pass reads the one before as `image` and its effect's input as `original`.
   */
  effects(source: AnyCanvas, effects: readonly ShaderPass[], textures?: ShaderTextures): AnyCanvas | null {
    const gl = this.context();
    if (!gl) return null;
    const steps = effects.flatMap((effect) => effect.sources.map((code, i) => ({ effect, code, first: i === 0 })));
    if (steps.length === 0) return null;
    let image = this.upload(gl, "image", source);
    let original = image;
    steps.forEach((step, i) => {
      if (step.first) original = image;
      const last = i === steps.length - 1;
      const target = last ? null : this.targetBesides(gl, image, original);
      const assets = this.assetTextures(gl, step.effect, textures);
      const kindOf = (ref: string) => assets.get(ref)?.kind;
      const program = this.program(gl, fragmentSource("effect", step.code, step.effect.params, last, kindOf));
      const bound: Record<string, { texture: WebGLTexture; kind: "2d" | "3d" }> = {
        image: { texture: image, kind: "2d" },
        original: { texture: original, kind: "2d" },
      };
      for (const [name, value] of Object.entries(step.effect.params)) {
        const asset = typeof value === "string" ? assets.get(value) : undefined;
        if (asset) bound[name] = asset;
      }
      this.draw(gl, program, target, step.effect.params, bound, { time: step.effect.time });
      if (target) image = target.texture;
    });
    return this.canvas;
  }

  /** The textures an effect's `"asset:ID"` params name, uploaded once each; throws for one not loaded. */
  private assetTextures(
    gl: Gl,
    effect: ShaderPass,
    textures: ShaderTextures | undefined,
  ): Map<string, { texture: WebGLTexture; kind: "2d" | "3d" }> {
    const out = new Map<string, { texture: WebGLTexture; kind: "2d" | "3d" }>();
    for (const value of Object.values(effect.params)) {
      if (typeof value !== "string" || !value.startsWith("asset:") || out.has(value)) continue;
      const data = textures?.get(value);
      if (!data) throw new Error(`effect "${effect.name}": ${value} is not loaded`);
      out.set(value, { texture: this.assetTexture(gl, data), kind: data.kind });
    }
    return out;
  }

  private assetTexture(gl: Gl, data: ShaderTexture): WebGLTexture {
    const cached = this.assets.get(data);
    if (cached) return cached;
    const texture = gl.createTexture() as WebGLTexture;
    const target = data.kind === "3d" ? gl.TEXTURE_3D : gl.TEXTURE_2D;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(target, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    if (data.kind === "3d")
      gl.texImage3D(target, 0, gl.RGBA8, data.size, data.size, data.size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data.data);
    else gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data.image);
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (data.kind === "3d") gl.texParameteri(target, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    this.assets.set(data, texture);
    return texture;
  }

  /** The transition between two pictures (either may be absent: an edge blends with nothing). */
  transition(from: AnyCanvas | null, to: AnyCanvas | null, pass: TransitionPass): AnyCanvas | null {
    const gl = this.context();
    if (!gl) return null;
    const empty = this.empty();
    const textures = {
      from: { texture: this.upload(gl, "from", from ?? empty), kind: "2d" as const },
      to: { texture: this.upload(gl, "to", to ?? empty), kind: "2d" as const },
    };
    const program = this.program(gl, fragmentSource("transition", pass.source, pass.params));
    this.draw(gl, program, null, pass.params, textures, { time: pass.time, progress: pass.progress });
    return this.canvas;
  }

  private context(): Gl | null {
    if (this.tried) return this.gl;
    this.tried = true;
    try {
      this.canvas = this.createCanvas(this.width, this.height);
      const gl = (this.canvas as HTMLCanvasElement).getContext?.("webgl2", {
        premultipliedAlpha: true,
        preserveDrawingBuffer: true,
        antialias: false,
      }) as Gl | null;
      if (!gl) return null;
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      // One triangle that covers the frame.
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      this.gl = gl;
    } catch {
      this.gl = null;
    }
    return this.gl;
  }

  private empty(): AnyCanvas {
    this.blank ??= this.createCanvas(this.width, this.height);
    return this.blank;
  }

  private texture(gl: Gl): WebGLTexture {
    const texture = gl.createTexture() as WebGLTexture;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  /** A picture as the texture of this input name, as plain (not premultiplied) colour, row 0 at the top. */
  private upload(gl: Gl, name: string, picture: AnyCanvas): WebGLTexture {
    let texture = this.uploads.get(name);
    if (!texture) {
      texture = this.texture(gl);
      this.uploads.set(name, texture);
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, picture as TexImageSource);
    return texture;
  }

  /** A pass target whose texture is neither of these, made on first use. */
  private targetBesides(gl: Gl, a: WebGLTexture, b: WebGLTexture): Target {
    const free = this.targets.find((t) => t.texture !== a && t.texture !== b);
    if (free) return free;
    const texture = this.texture(gl);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const framebuffer = gl.createFramebuffer() as WebGLFramebuffer;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const target = { texture, framebuffer };
    this.targets.push(target);
    return target;
  }

  private program(gl: Gl, fragment: string): WebGLProgram {
    const cached = this.programs.get(fragment);
    if (cached) return cached;
    const compile = (type: number, text: string): WebGLShader => {
      const shader = gl.createShader(type) as WebGLShader;
      gl.shaderSource(shader, text);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error(`the shader does not compile: ${gl.getShaderInfoLog(shader)?.trim()}`);
      return shader;
    };
    const program = gl.createProgram() as WebGLProgram;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.bindAttribLocation(program, 0, "position");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(`the shader does not link: ${gl.getProgramInfoLog(program)?.trim()}`);
    this.programs.set(fragment, program);
    return program;
  }

  /** One pass: `program` over the frame into `target` (a texture), or into the canvas when it is null. */
  private draw(
    gl: Gl,
    program: WebGLProgram,
    target: Target | null,
    params: Readonly<Record<string, unknown>>,
    textures: Readonly<Record<string, { readonly texture: WebGLTexture; readonly kind: "2d" | "3d" }>>,
    values: Readonly<Record<string, number>>,
  ): void {
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook.
    gl.useProgram(program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target?.framebuffer ?? null);
    gl.viewport(0, 0, this.width, this.height);
    Object.entries(textures).forEach(([name, { texture, kind }], unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(kind === "3d" ? gl.TEXTURE_3D : gl.TEXTURE_2D, texture);
      gl.uniform1i(gl.getUniformLocation(program, name), unit);
    });
    gl.uniform1f(gl.getUniformLocation(program, "cutcraft_flip"), target ? -1 : 1);
    gl.uniform2f(gl.getUniformLocation(program, "resolution"), this.width, this.height);
    for (const [name, value] of Object.entries(values)) gl.uniform1f(gl.getUniformLocation(program, name), value);
    for (const [name, value] of Object.entries(params)) {
      const u = uniformOf(value);
      const at = u && gl.getUniformLocation(program, name);
      if (!u || !at) continue;
      if (u.type === "float" || u.type === "bool") gl.uniform1f(at, u.value[0] as number);
      else if (u.type === "vec2") gl.uniform2fv(at, u.value);
      else if (u.type === "vec3") gl.uniform3fv(at, u.value);
      else gl.uniform4fv(at, u.value);
    }
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}
