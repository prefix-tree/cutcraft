// Runs the effects and transitions a file declares (`defineEffect()`, `defineTransition()`): each is a GLSL function the
// runner wraps in a fragment shader with its params as uniforms, drawn over a full-frame triangle with WebGL 2. Where
// there is no WebGL 2, `available` is false and the painter draws without them.
import type { ShaderPass, TransitionPass } from "../model/shaders";
import type { AnyCanvas, CreateCanvas } from "../types";

type Gl = WebGL2RenderingContext;
type Uniform = { readonly type: "float" | "bool" | "vec2" | "vec3" | "vec4"; readonly value: readonly number[] };

const VERTEX = `#version 300 es
in vec2 position;
out vec2 cutcraft_uv;
void main() {
  // uv (0, 0) is the picture's top left, as in CSS.
  cutcraft_uv = vec2((position.x + 1.0) / 2.0, (1.0 - position.y) / 2.0);
  gl_Position = vec4(position, 0.0, 1.0);
}`;

/** Names the runner gives every shader; a param may not take one. */
const RESERVED = new Set(["image", "from", "to", "resolution", "time", "progress", "position"]);

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

/** The fragment shader around a declared GLSL function: its inputs, its params as uniforms, and a `main` that calls it. */
export function fragmentSource(
  kind: "effect" | "transition",
  source: string,
  params: Readonly<Record<string, unknown>>,
): string {
  const uniforms = Object.entries(params)
    .map(([name, value]) => [name, uniformOf(value)] as const)
    .filter(([name, u]) => u && /^[A-Za-z_]\w*$/.test(name) && !RESERVED.has(name))
    .map(([name, u]) => `uniform ${u!.type} ${name};`);
  const inputs =
    kind === "effect"
      ? "uniform sampler2D image;"
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
  cutcraft_out = vec4(c.rgb * c.a, c.a);
}`;
}

export class ShaderRunner {
  private canvas: AnyCanvas | null = null;
  private gl: Gl | null = null;
  private tried = false;
  private readonly programs = new Map<string, WebGLProgram>();
  private readonly textures: WebGLTexture[] = [];
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

  /** The effects run in order over `source`; the result is the runner's own canvas, valid until its next run. */
  effects(source: AnyCanvas, passes: readonly ShaderPass[]): AnyCanvas | null {
    const gl = this.context();
    if (!gl) return null;
    let input: AnyCanvas = source;
    for (const pass of passes) {
      this.draw(gl, "effect", pass.source, pass.params, { image: input }, { time: pass.time });
      input = this.canvas as AnyCanvas;
    }
    return this.canvas;
  }

  /** The transition between two pictures (either may be absent: an edge blends with nothing). */
  transition(from: AnyCanvas | null, to: AnyCanvas | null, pass: TransitionPass): AnyCanvas | null {
    const gl = this.context();
    if (!gl) return null;
    const empty = this.empty();
    this.draw(
      gl,
      "transition",
      pass.source,
      pass.params,
      { from: from ?? empty, to: to ?? empty },
      { time: pass.time, progress: pass.progress },
    );
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

  private draw(
    gl: Gl,
    kind: "effect" | "transition",
    source: string,
    params: Readonly<Record<string, unknown>>,
    images: Readonly<Record<string, AnyCanvas>>,
    values: Readonly<Record<string, number>>,
  ): void {
    const program = this.program(gl, fragmentSource(kind, source, params));
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook.
    gl.useProgram(program);
    gl.viewport(0, 0, this.width, this.height);
    Object.entries(images).forEach(([name, image], unit) => {
      this.textures[unit] ??= gl.createTexture() as WebGLTexture;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, this.textures[unit] as WebGLTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image as TexImageSource);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(gl.getUniformLocation(program, name), unit);
    });
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
  }
}
