import type { BoardElements, GameState } from '../trailhead/types';

export function createBoard(container: HTMLElement): BoardElements {
  const cells: HTMLElement[][] = [];
  return { root: container, cells };
}

export function bindBoardInteractions(
  board: BoardElements,
  onSelect: (row: number, col: number) => void,
  onLongPress: (row: number, col: number) => void,
  onDrawStart?: (row: number, col: number) => void,
  onDrawStep?: (row: number, col: number) => void,
  onDrawEnd?: () => void,
  getDrawMode?: () => boolean,
): void {
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let startRow = -1;
  let startCol = -1;
  let touchMoved = false;
  let isDrawing = false;
  let lastDrawCell: [number, number] | null = null;

  function getCellFromPointer(e: PointerEvent): [number, number] | null {
    const target = e.target as HTMLElement | null;
    if (!target) return null;
    const cell = target.closest('[data-row]') as HTMLElement | null;
    if (!cell) return null;
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    if (Number.isNaN(row) || Number.isNaN(col)) return null;
    return [row, col];
  }

  board.root.addEventListener('pointerdown', (e) => {
    const cell = getCellFromPointer(e);
    if (!cell) return;
    const [row, col] = cell;
    startRow = row;
    startCol = col;
    touchMoved = false;

    const drawMode = getDrawMode?.() ?? false;
    if (drawMode && onDrawStart) {
      isDrawing = true;
      lastDrawCell = [row, col];
      onDrawStart(row, col);
      return;
    }

    longPressTimer = setTimeout(() => {
      longPressTimer = null;
      onLongPress(row, col);
    }, 500);
  });

  board.root.addEventListener('pointermove', (e) => {
    touchMoved = true;
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }

    if (!isDrawing || !onDrawStep || !getDrawMode) return;
    const cell = getCellFromPointer(e);
    if (!cell) return;
    const [row, col] = cell;
    if (lastDrawCell && lastDrawCell[0] === row && lastDrawCell[1] === col) return;
    lastDrawCell = [row, col];
    onDrawStep(row, col);
  });

  const clearTimer = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  board.root.addEventListener('pointerup', (e) => {
    const cell = getCellFromPointer(e);
    clearTimer();

    if (isDrawing) {
      isDrawing = false;
      lastDrawCell = null;
      onDrawEnd?.();
      return;
    }

    if (!cell) return;
    const [row, col] = cell;
    if (row === startRow && col === startCol && !touchMoved) {
      onSelect(row, col);
    }
  });

  board.root.addEventListener('pointercancel', () => {
    clearTimer();
    if (isDrawing) {
      isDrawing = false;
      lastDrawCell = null;
      onDrawEnd?.();
    }
  });
}

function getPathCells(state: GameState): Set<string> {
  const set = new Set<string>();
  const valueMap = new Map<number, [number, number]>();
  for (let r = 0; r < state.puzzle.rows; r++) {
    for (let c = 0; c < state.puzzle.cols; c++) {
      const v = state.grid[r][c];
      if (v !== null) valueMap.set(v, [r, c]);
    }
  }
  const N = state.puzzle.rows * state.puzzle.cols;
  for (let v = 1; v < N; v++) {
    const a = valueMap.get(v);
    const b = valueMap.get(v + 1);
    if (!a || !b) continue;
    const [r1, c1] = a;
    const [r2, c2] = b;
    if (Math.abs(r2 - r1) <= 1 && Math.abs(c2 - c1) <= 1) {
      set.add(`${r1},${c1}`);
      set.add(`${r2},${c2}`);
    }
  }
  return set;
}

export function renderBoard(board: BoardElements, state: GameState): void {
  const { puzzle, grid, selected, won } = state;
  const rows = puzzle.rows;
  const cols = puzzle.cols;

  // Rebuild grid structure when dimensions change
  if (board.cells.length !== rows || (board.cells[0]?.length ?? 0) !== cols) {
    board.root.style.setProperty('--board-cols', String(cols));
    board.root.innerHTML = '';
    board.cells.length = 0;
    for (let r = 0; r < rows; r++) {
      const rowCells: HTMLElement[] = [];
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);
        cell.setAttribute('role', 'gridcell');
        board.root.appendChild(cell);
        rowCells.push(cell);
      }
      board.cells.push(rowCells);
    }
    // Set columns CSS for grid layout
    board.root.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  }

  board.root.classList.toggle('draw-active', state.drawMode);
  const pathCells = state.traceMode || won ? getPathCells(state) : new Set<string>();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = board.cells[r][c];
      const v = grid[r][c];
      const isGiven = puzzle.givens.some((g) => g.x === c && g.y === r);
      const isSelected = selected?.row === r && selected?.col === c;

      let classes = 'cell';
      if (isGiven) classes += ' given';
      if (isSelected) classes += ' selected';
      if (v !== null) {
        classes += ' filled';
      } else {
        classes += ' empty';
      }
      if (pathCells.has(`${r},${c}`)) classes += ' path';
      cell.className = classes;
      cell.textContent = v !== null ? String(v) : '';
    }
  }

  // Highlight next expected neighbors lightly
  if (selected) {
    const sr = selected.row;
    const sc = selected.col;
    const sv = grid[sr][sc];
    if (sv !== null) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const ov = grid[r][c];
          if (ov === sv - 1 || ov === sv + 1) {
            board.cells[r][c].classList.add('neighbor');
          }
        }
      }
    }
  }
}
