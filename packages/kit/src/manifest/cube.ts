// Reads a 3D colour lookup table in the `.cube` format (Adobe's Cube LUT Specification 1.0, the format colour tools
// export): `LUT_3D_SIZE N`, optional `TITLE`, `DOMAIN_MIN` and `DOMAIN_MAX`, then N³ lines of `r g b` output values,
// red changing fastest, then green, then blue. Lines starting with # are comments. A 1D table (`LUT_1D_SIZE`) is
// refused.

export interface CubeLut {
  readonly title?: string;
  /** Entries per axis. */
  readonly size: number;
  /** The input range each axis covers; inputs are scaled from it to 0..1 before the lookup. */
  readonly domainMin: readonly [number, number, number];
  readonly domainMax: readonly [number, number, number];
  /** size³ RGB triples as read, red fastest: index (r + g·size + b·size²)·3. */
  readonly data: Float32Array;
}

const MAX_SIZE = 256;

function triple(parts: readonly string[], line: number): [number, number, number] {
  const values = parts.map(Number);
  if (values.length !== 3 || values.some((v) => !Number.isFinite(v)))
    throw new Error(`.cube line ${line}: expected three numbers`);
  return values as [number, number, number];
}

/** Parses a `.cube` file's text; throws a message naming the line where it is wrong. */
export function parseCube(text: string): CubeLut {
  let title: string | undefined;
  let size = 0;
  let domainMin: [number, number, number] = [0, 0, 0];
  let domainMax: [number, number, number] = [1, 1, 1];
  let data: Float32Array | null = null;
  let count = 0;
  const lines = text.split(/\r?\n/);
  for (let n = 0; n < lines.length; n++) {
    const line = (lines[n] as string).trim();
    // A comment is a line that starts with #, so a title may hold one.
    if (!line || line.startsWith("#")) continue;
    const [key, ...rest] = line.split(/\s+/);
    if (key === "TITLE") title = line.slice(5).trim().replace(/^"|"$/g, "");
    else if (key === "LUT_1D_SIZE") throw new Error(".cube: a 1D table; a LUT here is 3D (LUT_3D_SIZE)");
    else if (key === "LUT_3D_SIZE") {
      size = Number(rest[0]);
      if (!Number.isInteger(size) || size < 2 || size > MAX_SIZE)
        throw new Error(`.cube line ${n + 1}: LUT_3D_SIZE is a whole number from 2 to ${MAX_SIZE}`);
      data = new Float32Array(size * size * size * 3);
    } else if (key === "DOMAIN_MIN") domainMin = triple(rest, n + 1);
    else if (key === "DOMAIN_MAX") domainMax = triple(rest, n + 1);
    else if (/^[A-Z][A-Z0-9_]*$/.test(key as string)) continue;
    else {
      if (!data) throw new Error(`.cube line ${n + 1}: values before LUT_3D_SIZE`);
      if (count >= size * size * size) throw new Error(`.cube line ${n + 1}: more than ${size}³ values`);
      data.set(triple([key as string, ...rest], n + 1), count * 3);
      count++;
    }
  }
  if (!data) throw new Error(".cube: no LUT_3D_SIZE");
  if (count !== size * size * size)
    throw new Error(`.cube: ${count} values, expected ${size}³ = ${size * size * size}`);
  if (domainMax.some((v, i) => v <= (domainMin[i] as number)))
    throw new Error(".cube: DOMAIN_MAX is not above DOMAIN_MIN");
  return { ...(title ? { title } : {}), size, domainMin, domainMax, data };
}
