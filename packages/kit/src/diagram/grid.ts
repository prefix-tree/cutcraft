/** One cell of a grid: where it is in the grid, and its box. The box is a CSS `style` as it stands. */
export interface GridCell {
  /** Counted along the rows, from 0. */
  readonly index: number;
  readonly column: number;
  readonly row: number;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface GridOptions {
  readonly columns: number;
  readonly rows: number;
  /** The size of the whole grid, in pixels; a cell is this divided by the columns and the rows. */
  readonly width: number;
  readonly height: number;
  /** Where the grid's top-left corner is. Default 0, 0. */
  readonly x?: number;
  readonly y?: number;
}

export interface Grid {
  readonly columns: number;
  readonly rows: number;
  /** The size of one cell. */
  readonly cell: { readonly width: number; readonly height: number };
  /** The box of the cell at a column and a row, counted from 0. Outside the grid it is where that cell would be. */
  rect(column: number, row: number): Pick<GridCell, "left" | "top" | "width" | "height">;
  /** Every cell, along the rows. */
  readonly cells: readonly GridCell[];
}

/**
 * The geometry of a grid, and nothing drawn: a board, a wall of letters, a calendar. It hands back boxes, so what
 * goes in each cell is yours: `grid(...).cells.map((cell) => <div key={cell.index} style={rectOf(cell)}>…</div>)`.
 */
export function grid({ columns, rows, width, height, x = 0, y = 0 }: GridOptions): Grid {
  if (!(columns >= 1) || !(rows >= 1) || !Number.isInteger(columns) || !Number.isInteger(rows))
    throw new Error(`grid() wants whole numbers of columns and rows, at least 1, got ${columns} by ${rows}`);
  const cell = { width: width / columns, height: height / rows };
  const rect = (column: number, row: number) => ({
    left: x + column * cell.width,
    top: y + row * cell.height,
    width: cell.width,
    height: cell.height,
  });
  const cells = Array.from({ length: columns * rows }, (_, index) => {
    const column = index % columns,
      row = Math.floor(index / columns);
    return { index, column, row, ...rect(column, row) };
  });
  return { columns, rows, cell, rect, cells };
}
