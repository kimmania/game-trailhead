import type { Difficulty, GameState, TrailPuzzle } from './types';
import { createGameState } from './storage';

const puzzleBanks = new Map<Difficulty, TrailPuzzle[]>();

export async function fetchBank(difficulty: Difficulty): Promise<TrailPuzzle[]> {
  if (puzzleBanks.has(difficulty)) return puzzleBanks.get(difficulty)!;

  const url = `puzzles/${difficulty}.json?v=${(window as any).__BUILD_HASH__ || Date.now().toString(36)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  const puzzles: TrailPuzzle[] = await res.json();
  puzzleBanks.set(difficulty, puzzles);
  return puzzles;
}

export function resetGameState(state: GameState): void {
  const puzzle = state.puzzle;
  for (let r = 0; r < puzzle.rows; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      state.grid[r][c] = null;
    }
  }
  for (const g of puzzle.givens) {
    state.grid[g.y][g.x] = g.value;
  }
  state.history = [];
  state.won = false;
  state.hintCount = 0;
  state.traceMode = false;
  state.selected = null;
}

export async function startNewGame(difficulty: Difficulty): Promise<GameState> {
  const puzzles = await fetchBank(difficulty);
  const puzzle = pickRandom(puzzles);
  return createGameState(puzzle);
}

function pickRandom(puzzles: TrailPuzzle[]): TrailPuzzle {
  let played: string[] = [];
  try {
    played = JSON.parse(localStorage.getItem('trailhead-played') || '[]') as string[];
  } catch {
    // ignore
  }
  const candidates = puzzles.filter((p) => !played.includes(p.id));
  const pool = candidates.length > 0 ? candidates : puzzles;
  const puzzle = pool[Math.floor(Math.random() * pool.length)];

  played.push(puzzle.id);
  if (played.length > 600) played = played.slice(played.length - 600);
  try {
    localStorage.setItem('trailhead-played', JSON.stringify(played));
  } catch {
    // ignore
  }

  return puzzle;
}
