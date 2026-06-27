# Trailhead

A path-completion puzzle game built as a Progressive Web App (PWA). Play anywhere — on iPad, iPhone, or any modern browser.

**Live:** [https://kimmania.github.io/game-trailhead/](https://kimmania.github.io/game-trailhead/)

## How to Play

Trailhead is a grid-based number puzzle. The goal is simple:

1. **Fill every cell** with consecutive numbers from `1` to `N` (where `N` is the total number of cells).
2. The sequence must form a **continuous trail** — every number must be adjacent (horizontally, vertically, or diagonally, depending on the difficulty) to both the number before it and the number after it.
3. Some numbers are given — they cannot be changed.

### Controls

- **Tap a cell** to select it, then tap a number on the keypad to place it.
- **Arrow keys** to navigate
- **Digits** to place numbers directly
- **Backspace / Delete** to clear a cell

### Tools

- **Undo** — revert your last move (up to 30 steps)
- **Hint** — fills in one correct empty cell for you
- **Auto-Fill** — automatically fills cells where only one possible number can fit
- **Trace Mode** — visualizes the current sequence path, helping you spot broken chains

## Difficulty Levels

| Level | Grid | Adjacency | Givens | Puzzles |
|-------|------|-----------|--------|---------|
| Tutorial | 5×5 | 8-way | 5–7 | 25 |
| Easy | 6×6 | 8-way | 5–7 | 50 |
| Medium | 8×8 | 8-way | 6–8 | 100 |
| Hard | 10×10 | 8-way | 7–10 | 300 |
| Expert | 10×10 | 4-way | 10–14 | 300 |
| Master | 12×12 | 4-way | 12–16 | 300 |

**1,275 total puzzles** — tap **New Game** anytime to try a random puzzle from the selected difficulty.

## Development

### Requirements
- Node.js 22+
- Python 3 (for regenerating puzzle banks)

### Install

```bash
npm install
```

### Development server

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Regenerate puzzle banks

```bash
npm run generate-puzzles
```

This runs `scripts/generate_puzzles.py` and writes JSON files into `public/puzzles/`.

## Tech Stack

- **Vite** — fast dev server + production builds
- **TypeScript** — fully typed game engine and UI
- **vite-plugin-pwa** — service worker, web manifest, and Workbox runtime caching
- **GitHub Actions** — automatic build & deploy to GitHub Pages on every push to `main`

## Project Structure

```
src/
  trailhead/
    types.ts       # Shared types: TrailPuzzle, GameState, Difficulty, etc.
    validator.ts   # Path & adjacency validation, conflict detection, forced-cell deduction
    puzzle.ts      # Fetch puzzle banks, pick random puzzle, game-state initialization
    storage.ts     # Save / load game progress via localStorage
  ui/
    board.ts       # Grid rendering, tap/drag interaction, keyboard navigation
    controls.ts    # Header buttons, difficulty selector, timer, modals
    number-pad.ts  # On-screen digit keypad + hint highlighting
  app.ts           # Main app controller (state machine, orchestration)
  main.ts          # Entry point
  style.css        # Dark green theme, responsive layout, PWA-safe overscroll
public/
  puzzles/         # JSON puzzle banks for each difficulty
  icons/           # App icons (192, 512) and Apple touch icon
scripts/
  generate_puzzles.py  # Fast Hamiltonian path generator
```

## Puzzle Generation

Puzzles are generated using snake-based Hamiltonian path algorithms with randomized start corners, row/column traversal variants, and reflections. This produces thousands of unique paths instantly, with givens selected at spread intervals to create varied puzzle configurations. The process is repeatable via `generate-puzzles.py`.

## License

MIT
