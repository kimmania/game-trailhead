export type Adjacency = 4 | 8;
export type Difficulty = 'tutorial' | 'easy' | 'medium' | 'hard' | 'expert' | 'master';
export const DIFFICULTIES: Difficulty[] = [
  'tutorial',
  'easy',
  'medium',
  'hard',
  'expert',
  'master',
];
export const LAST_DIFFICULTY_KEY = 'trailhead-last-difficulty';

export interface TrailGiven {
  x: number;
  y: number;
  value: number;
}

export interface TrailPuzzle {
  id: string;
  rows: number;
  cols: number;
  adjacency: Adjacency;
  givens: TrailGiven[];
  solution: number[]; // flat array: index = row * cols + col
}

export interface GameState {
  puzzle: TrailPuzzle;
  grid: (number | null)[][];
  selected: { row: number; col: number } | null;
  history: (number | null)[][][];
  won: boolean;
  startTime: number;
  elapsed: number;
  hintCount: number;
  traceMode: boolean;
  usedAutoFill: boolean;
}

export interface BoardElements {
  root: HTMLElement;
  cells: HTMLElement[][];
}
