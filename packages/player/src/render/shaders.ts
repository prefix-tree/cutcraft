// Runs shader effects (the kit's own and the file's, `effect()`) and transitions (`transition()`): each pass is a GLSL
// function the runner wraps in a fragment shader with its params as uniforms, drawn over a full-frame triangle
// with WebGL 2. Passes between the first and the last draw into textures, not the canvas. Where there is no WebGL 2,
// `available` is false and the painter draws without them.

import type { ShaderStep, ShaderUniform } from "@cutcraft/kit";

import type { ShaderTexture, ShaderTextures } from "../media/shader-textures";
import type { ShaderPass, TransitionPass } from "../model/shaders";
import type { AnyCanvas, CreateCanvas } from "../types";

type Gl = WebGL2RenderingContext;

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

/** Names the runner gives every shader; a computed table may not take one. */
const INPUTS = new Set(["image", "original", "from", "to", "resolution", "time", "progress", "position"]);

/** The uniform a param is declared as: shaders read it as `params.NAME`, which the runner rewrites to this. */
export const paramUniform = (name: string): string => `cc_param_${name}`;

/** A shader's `params.NAME` reads, as the uniforms the runner declares. */
const PARAM_READ = /(?<![.\w])params\.([A-Za-z_]\w*)/g;

/** A compile or link log with the param uniforms back as the shader wrote them. */
const asWritten = (log: string | null | undefined): string | undefined =>
  log?.trim().replace(/cc_param_(\w+)/g, "params.$1");

/** A param's uniform as a pass declares it: its GLSL type, and an enum's options. */
export interface Declared {
  readonly name: string;
  readonly glsl: "float" | "bool" | "int" | "vec2" | "vec3" | "vec4" | "sampler2D" | "sampler3D";
  readonly options?: readonly string[];
}

/** `#rgb` or `#rrggbb` as 0..1 channels, or null. */
function rgbOf(value: unknown): number[] | null {
  if (typeof value !== "string") return null;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value)?.[1];
  if (!hex) return null;
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16) / 255);
}

const isNumbers = (v: unknown): v is number[] => Array.isArray(v) && v.every((x) => typeof x === "number");

/**
 * How each param reaches a pass's shader: the kind its schema gave it, and, where the schema left it open (a string or
 * a list of numbers of no fixed length), the kind its value has. A param with nothing a uniform can take is left out.
 */
export function declare(
  uniforms: readonly ShaderUniform[],
  params: Readonly<Record<string, unknown>>,
  /** The kind of texture an `"asset:ID"` names: a 3D table (a LUT) or a 2D picture; undefined when not loaded. */
  textureKind: (ref: string) => "2d" | "3d" | undefined = () => undefined,
): Declared[] {
  const out: Declared[] = [];
  for (const u of uniforms) {
    const value = params[u.name];
    const sampler = () => {
      const kind = typeof value === "string" ? textureKind(value) : undefined;
      return kind ? ({ name: u.name, glsl: kind === "3d" ? "sampler3D" : "sampler2D" } as const) : null;
    };
    let d: Declared | null = null;
    switch (u.kind) {
      case "float":
      case "bool":
      case "vec2":
      case "vec3":
      case "vec4":
        d = { name: u.name, glsl: u.kind };
        break;
      case "colour":
        d = { name: u.name, glsl: "vec3" };
        break;
      case "enum":
        d = { name: u.name, glsl: "int", options: u.options ?? [] };
        break;
      case "asset":
        d = sampler();
        break;
      case "string":
        d = sampler() ?? (rgbOf(value) ? { name: u.name, glsl: "vec3" } : null);
        break;
      case "numbers":
        d =
          isNumbers(value) && value.length >= 2 && value.length <= 4
            ? { name: u.name, glsl: `vec${value.length}` as "vec2" | "vec3" | "vec4" }
            : null;
        break;
    }
    if (d) out.push(d);
  }
  return out;
}

/** A param's value as its declared uniform takes it, or null to leave it unset (a sampler is bound, not set). */
export function uniformValue(d: Declared, value: unknown): number[] | null {
  switch (d.glsl) {
    case "float":
      return typeof value === "number" && Number.isFinite(value) ? [value] : null;
    case "bool":
      return typeof value === "boolean" ? [value ? 1 : 0] : null;
    case "int": {
      const i = typeof value === "string" ? (d.options ?? []).indexOf(value) : -1;
      return i >= 0 ? [i] : null;
    }
    case "vec3":
      return rgbOf(value) ?? (isNumbers(value) && value.length === 3 ? value : null);
    case "vec2":
    case "vec4":
      return isNumbers(value) && value.length === Number(d.glsl.slice(3)) ? value : null;
    default:
      return null;
  }
}

/** `params.NAME.OPTION` naming an enum's option. */
const OPTION_READ = /(?<![.\w])params\.([A-Za-z_]\w*)\.([A-Za-z_]\w*)/g;

/**
 * The fragment shader around a pass's GLSL function: its inputs, its params as the uniforms they are declared as (read
 * as `params.NAME`, an enum's options as `params.NAME.OPTION`), and a `main` that calls it. A final pass writes
 * premultiplied colour for the canvas; a pass into a texture writes plain colour, as the next pass reads its `image`.
 */
export function fragmentSource(
  kind: "effect" | "transition",
  source: string,
  declared: readonly Declared[],
  final = true,
  /** Pictures a built-in computes from its params (a curve's table), declared as `sampler2D`s of these names. */
  tables: readonly string[] = [],
): string {
  const named = tables
    .filter((name) => /^[A-Za-z_]\w*$/.test(name) && !INPUTS.has(name))
    .map((name) => `uniform highp sampler2D ${name};`);
  const uniforms = declared
    .filter((d) => /^[A-Za-z_]\w*$/.test(d.name))
    .map((d) => `uniform ${d.glsl.startsWith("sampler") ? "highp " : ""}${d.glsl} ${paramUniform(d.name)};`);
  const inputs =
    kind === "effect"
      ? "uniform sampler2D image;\nuniform sampler2D original;"
      : "uniform sampler2D from;\nuniform sampler2D to;\nuniform float progress;";
  const code = source
    .replace(OPTION_READ, (read, name: string, option: string) => {
      const i = declared.find((d) => d.name === name && d.glsl === "int")?.options?.indexOf(option) ?? -1;
      return i >= 0 ? String(i) : read;
    })
    .replace(PARAM_READ, (_, name: string) => paramUniform(name));
  return `#version 300 es
precision highp float;
${inputs}
uniform vec2 resolution;
uniform float time;
${[...named, ...uniforms].join("\n")}
in vec2 cutcraft_uv;
out vec4 cutcraft_out;
#line 1
${code}
void main() {
  vec4 c = ${kind}(cutcraft_uv);
  cutcraft_out = ${final ? "vec4(c.rgb * c.a, c.a)" : "c"};
}`;
}

/** How many computed tables (a curve's, by its params) stay uploaded. */
const MAX_TABLES = 32;

/** A texture the size of the frame that a pass draws into. */
interface Target {
  readonly texture: WebGLTexture;
  readonly framebuffer: WebGLFramebuffer;
  readonly width: number;
  readonly height: number;
}

/** A pass as the runner draws it: the effect it belongs to, its GLSL, its size and region, and whether it is the first. */
export interface PlannedStep {
  readonly effect: ShaderPass;
  readonly source: string;
  readonly scale: 1 | 0.5 | 0.25;
  readonly region?: ShaderStep["region"];
  readonly first: boolean;
}

const COPY = "vec4 effect(vec2 uv) { return texture(image, uv); }";

/**
 * The passes the runner draws for these effects, in order: each effect's steps, or its sources over the whole frame.
 * The last draws the canvas, full size and whole, so one that is smaller or partial is followed by a copy.
 */
export function planSteps(effects: readonly ShaderPass[]): PlannedStep[] {
  const out: PlannedStep[] = effects.flatMap((effect) =>
    (effect.steps ?? effect.sources.map((source): ShaderStep => ({ source }))).map((step, i) => ({
      effect,
      source: step.source,
      scale: step.scale ?? 1,
      ...(step.region ? { region: step.region } : {}),
      first: i === 0,
    })),
  );
  const last = out[out.length - 1];
  if (last && (last.scale !== 1 || last.region))
    out.push({
      effect: { name: "copy", sources: [COPY], builtIn: true, params: {}, uniforms: [], time: last.effect.time },
      source: COPY,
      scale: 1,
      first: true,
    });
  return out;
}

export class ShaderRunner {
  private canvas: AnyCanvas | null = null;
  private gl: Gl | null = null;
  private tried = false;
  /** Programs by source, then by how the source's uniforms are declared. */
  private readonly programs = new Map<string, Map<string, WebGLProgram>>();
  /** Uniform locations by program and name. */
  private readonly locations = new WeakMap<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
  /** Textures the pictures are uploaded into, one per input name. */
  private readonly uploads = new Map<string, WebGLTexture>();
  /** Textures between passes, by size; enough that a pass never draws into its `image` or its effect's `original`. */
  private readonly targets: Target[] = [];
  /** The textures of assets (LUTs, images) uploaded, by their loaded data. */
  private readonly assets = new WeakMap<ShaderTexture, WebGLTexture>();
  /** The tables built-ins computed, by effect and params, oldest first. */
  private readonly tables = new Map<string, Map<string, WebGLTexture>>();
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
    const steps = planSteps(effects);
    if (steps.length === 0) return null;
    let image = this.upload(gl, "image", source);
    let original = image;
    steps.forEach((step, i) => {
      if (step.first) original = image;
      const last = i === steps.length - 1;
      const size = (n: number) => Math.max(1, Math.ceil(n * step.scale));
      const target = last ? null : this.targetBesides(gl, image, original, size(this.width), size(this.height));
      const assets = this.assetTextures(gl, step.effect, textures);
      const kindOf = (ref: string) => assets.get(ref)?.kind;
      const tables = this.tableTextures(gl, step.effect);
      const declared = declare(step.effect.uniforms, step.effect.params, kindOf);
      const program = this.programFor(gl, "effect", step.source, declared, last, [...tables.keys()]);
      const bound: Record<string, { texture: WebGLTexture; kind: "2d" | "3d" }> = {
        image: { texture: image, kind: "2d" },
        original: { texture: original, kind: "2d" },
      };
      for (const [name, texture] of tables) bound[name] ??= { texture, kind: "2d" };
      for (const [name, value] of Object.entries(step.effect.params)) {
        const asset = typeof value === "string" ? assets.get(value) : undefined;
        if (asset) bound[paramUniform(name)] = asset;
      }
      this.draw(gl, program, target, declared, step.effect.params, bound, { time: step.effect.time }, step.region);
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

  /**
   * The tables a built-in computes from its params, uploaded; kept by the effect and its params, so a curve that does
   * not change is computed and uploaded once. The oldest are let go past a few dozen.
   */
  private tableTextures(gl: Gl, effect: ShaderPass): ReadonlyMap<string, WebGLTexture> {
    if (!effect.tables) return new Map();
    const key = `${effect.name}:${JSON.stringify(effect.params)}`;
    const cached = this.tables.get(key);
    if (cached) return cached;
    const out = new Map<string, WebGLTexture>();
    for (const [name, table] of Object.entries(effect.tables(effect.params))) {
      const texture = gl.createTexture() as WebGLTexture;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, table.width, table.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, table.data);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      out.set(name, texture);
    }
    if (this.tables.size >= MAX_TABLES) {
      const [oldest, textures] = this.tables.entries().next().value as [string, Map<string, WebGLTexture>];
      for (const t of textures.values()) gl.deleteTexture(t);
      this.tables.delete(oldest);
    }
    this.tables.set(key, out);
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
    const declared = declare(pass.uniforms, pass.params);
    const program = this.programFor(gl, "transition", pass.source, declared, true, []);
    this.draw(gl, program, null, declared, pass.params, textures, { time: pass.time, progress: pass.progress });
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
  private targetBesides(gl: Gl, a: WebGLTexture, b: WebGLTexture, width: number, height: number): Target {
    const free = this.targets.find(
      (t) => t.texture !== a && t.texture !== b && t.width === width && t.height === height,
    );
    if (free) return free;
    const texture = this.texture(gl);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const framebuffer = gl.createFramebuffer() as WebGLFramebuffer;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const target = { texture, framebuffer, width, height };
    this.targets.push(target);
    return target;
  }

  /**
   * The program of a pass's source with these uniforms, built once: kept by its source (the same string each frame, so
   * its hash is computed once) and a short key of how it is declared, so no shader text is built for a frame.
   */
  private programFor(
    gl: Gl,
    kind: "effect" | "transition",
    source: string,
    declared: readonly Declared[],
    final: boolean,
    tables: readonly string[],
  ): WebGLProgram {
    const key = `${kind}|${final ? 1 : 0}|${declared.map((d) => `${d.name}:${d.glsl}`).join(",")}|${tables.join(",")}`;
    let bySource = this.programs.get(source);
    if (!bySource) {
      bySource = new Map();
      this.programs.set(source, bySource);
    }
    const cached = bySource.get(key);
    if (cached) return cached;
    const program = this.program(gl, fragmentSource(kind, source, declared, final, tables));
    bySource.set(key, program);
    return program;
  }

  /** A uniform's location in a program, looked up once. */
  private location(gl: Gl, program: WebGLProgram, name: string): WebGLUniformLocation | null {
    let names = this.locations.get(program);
    if (!names) {
      names = new Map();
      this.locations.set(program, names);
    }
    if (!names.has(name)) names.set(name, gl.getUniformLocation(program, name));
    return names.get(name) ?? null;
  }

  private program(gl: Gl, fragment: string): WebGLProgram {
    const compile = (type: number, text: string): WebGLShader => {
      const shader = gl.createShader(type) as WebGLShader;
      gl.shaderSource(shader, text);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error(`the shader does not compile: ${asWritten(gl.getShaderInfoLog(shader))}`);
      return shader;
    };
    const program = gl.createProgram() as WebGLProgram;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.bindAttribLocation(program, 0, "position");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(`the shader does not link: ${asWritten(gl.getProgramInfoLog(program))}`);
    return program;
  }

  /** One pass: `program` over the frame into `target` (a texture), or into the canvas when it is null. */
  private draw(
    gl: Gl,
    program: WebGLProgram,
    target: Target | null,
    declared: readonly Declared[],
    params: Readonly<Record<string, unknown>>,
    textures: Readonly<Record<string, { readonly texture: WebGLTexture; readonly kind: "2d" | "3d" }>>,
    values: Readonly<Record<string, number>>,
    region?: ShaderStep["region"],
  ): void {
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook.
    gl.useProgram(program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target?.framebuffer ?? null);
    const [w, h] = target ? [target.width, target.height] : [this.width, this.height];
    gl.viewport(0, 0, w, h);
    if (region) {
      // The box grown by the margin, in this target's pixels; a target's row 0 is the picture's top.
      const [bx, by, bw, bh] = region.box;
      const mx = region.margin / this.width,
        my = region.margin / this.height;
      const x0 = Math.max(0, Math.floor((bx - mx) * w)),
        x1 = Math.min(w, Math.ceil((bx + bw + mx) * w));
      const top = Math.max(0, Math.floor((by - my) * h)),
        bottom = Math.min(h, Math.ceil((by + bh + my) * h));
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(x0, target ? top : h - bottom, Math.max(0, x1 - x0), Math.max(0, bottom - top));
    }
    Object.entries(textures).forEach(([name, { texture, kind }], unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(kind === "3d" ? gl.TEXTURE_3D : gl.TEXTURE_2D, texture);
      gl.uniform1i(this.location(gl, program, name), unit);
    });
    gl.uniform1f(this.location(gl, program, "cutcraft_flip"), target ? -1 : 1);
    gl.uniform2f(this.location(gl, program, "resolution"), this.width, this.height);
    for (const [name, value] of Object.entries(values)) gl.uniform1f(this.location(gl, program, name), value);
    for (const d of declared) {
      const value = uniformValue(d, params[d.name]);
      const at = value && this.location(gl, program, paramUniform(d.name));
      if (!value || !at) continue;
      if (d.glsl === "float") gl.uniform1f(at, value[0] as number);
      else if (d.glsl === "bool" || d.glsl === "int") gl.uniform1i(at, value[0] as number);
      else if (d.glsl === "vec2") gl.uniform2fv(at, value);
      else if (d.glsl === "vec3") gl.uniform3fv(at, value);
      else gl.uniform4fv(at, value);
    }
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (region) gl.disable(gl.SCISSOR_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}
