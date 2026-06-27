import type { GameState, TrailPuzzle } from './types';

const SAVE_KEY = 'trailhead-save';

interface SavedGame {
  puzzle: TrailPuzzle;
  grid: (number | null)[][];
  elapsed: number;
  hintCount: number;
  usedAutoFill: boolean;
  drawMode: boolean;
}

export function saveGame(state: GameState): void {
  const saved: SavedGame = {
    puzzle: state.puzzle,
    grid: state.grid,
    elapsed: state.elapsed + (Date.now() - state.startTime),
    hintCount: state.hintCount,
    usedAutoFill: state.usedAutoFill,
    drawMode: state.drawMode,
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
  } catch {
    // ignore quota errors
  }
}

export function loadSavedGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const saved: SavedGame = JSON.parse(raw);
    const state = createGameState(saved.puzzle);
    state.grid = saved.grid.map((row) => [...row]);
    state.elapsed = saved.elapsed;
    state.hintCount = saved.hintCount;
    state.usedAutoFill = saved.usedAutoFill;
    state.drawMode = saved.drawMode ?? false;
    state.startTime = Date.now();
    return state;
  } catch {
    return null;
  }
}

export function clearSavedGame(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function createGameState(puzzle: TrailPuzzle): GameState {
  const grid: (number | null)[][] = Array.from({ length: puzzle.rows }, () =>
    Array.from({ length: puzzle.cols }, () => null),
  );
  for (const g of puzzle.givens) {
    grid[g.y][g.x] = g.value;
  }
  return {
    puzzle,
    grid,
    selected: null,
    history: [],
    won: false,
    startTime: Date.now(),
    elapsed: 0,
    hintCount: 0,
    traceMode: false,
    usedAutoFill: false,
    drawMode: false,
  };
}
