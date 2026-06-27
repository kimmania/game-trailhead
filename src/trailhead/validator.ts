import type { GameState } from './types';

export function getNeighbors(
  row: number,
  col: number,
  rows: number,
  cols: number,
  adjacency: number,
): [number, number][] {
  const dirs: [number, number][] =
    adjacency === 8
      ? [
          [-1, -1],
          [-1, 0],
          [-1, 1],
          [0, -1],
          [0, 1],
          [1, -1],
          [1, 0],
          [1, 1],
        ]
      : [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ];
  const result: [number, number][] = [];
  for (const [dr, dc] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
      result.push([nr, nc]);
    }
  }
  return result;
}

export function getConflicts(state: GameState): { row: number; col: number }[] {
  const { puzzle, grid } = state;
  const conflicts = new Set<string>();
  const rows = puzzle.rows;
  const cols = puzzle.cols;
  const N = rows * cols;

  // Duplicate values
  const valuePositions = new Map<number, [number, number][]>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = grid[r][c];
      if (v !== null) {
        const arr = valuePositions.get(v) ?? [];
        arr.push([r, c]);
        valuePositions.set(v, arr);
      }
    }
  }
  for (const [, positions] of valuePositions) {
    if (positions.length > 1) {
      for (const [r, c] of positions) {
        conflicts.add(`${r},${c}`);
      }
    }
  }

  // Given mismatch
  for (const g of puzzle.givens) {
    if (grid[g.y][g.x] !== g.value) {
      conflicts.add(`${g.y},${g.x}`);
    }
  }

  // Adjacency constraints
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = grid[r][c];
      if (v === null) continue;
      const neighbors = getNeighbors(r, c, rows, cols, puzzle.adjacency);
      let hasPrev = false;
      let hasNext = false;
      for (const [nr, nc] of neighbors) {
        const nv = grid[nr][nc];
        if (nv !== null) {
          if (nv === v - 1) hasPrev = true;
          if (nv === v + 1) hasNext = true;
        }
      }
      if (v > 1 && !hasPrev) conflicts.add(`${r},${c}`);
      if (v < N && !hasNext) conflicts.add(`${r},${c}`);
    }
  }

  return Array.from(conflicts).map((s) => {
    const [r, c] = s.split(',').map(Number);
    return { row: r, col: c };
  });
}

export function isWin(state: GameState): boolean {
  const { puzzle, grid } = state;
  const rows = puzzle.rows;
  const cols = puzzle.cols;
  const N = rows * cols;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === null) return false;
    }
  }
  if (getConflicts(state).length > 0) return false;
  // Verify the sequence 1..N is fully connected
  const pos = new Map<number, [number, number]>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = grid[r][c];
      if (v !== null) pos.set(v, [r, c]);
    }
  }
  for (let v = 1; v < N; v++) {
    const [r1, c1] = pos.get(v)!;
    const [r2, c2] = pos.get(v + 1)!;
    const dr = Math.abs(r2 - r1);
    const dc = Math.abs(c2 - c1);
    if (puzzle.adjacency === 4) {
      if (!((dr === 1 && dc === 0) || (dr === 0 && dc === 1))) return false;
    } else {
      if (Math.max(dr, dc) !== 1) return false;
    }
  }
  return true;
}

/** Find cells where only one number can possibly be placed. */
export function deduceForcedCells(state: GameState): { row: number; col: number; value: number }[] {
  const { puzzle, grid } = state;
  const rows = puzzle.rows;
  const cols = puzzle.cols;
  const N = rows * cols;
  const forced: { row: number; col: number; value: number }[] = [];

  const placed = new Set<number>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== null) placed.add(grid[r][c]!);
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== null) continue;
      const neighbors = getNeighbors(r, c, rows, cols, puzzle.adjacency);
      const candidates: Set<number> = new Set();
      for (const [nr, nc] of neighbors) {
        const nv = grid[nr][nc];
        if (nv !== null) {
          if (nv > 1 && !placed.has(nv - 1)) candidates.add(nv - 1);
          if (nv < N && !placed.has(nv + 1)) candidates.add(nv + 1);
        }
      }
      if (candidates.size === 1) {
        const [val] = candidates;
        forced.push({ row: r, col: c, value: val });
      }
    }
  }
  return forced;
}
