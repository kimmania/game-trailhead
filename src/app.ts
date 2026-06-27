import type { Difficulty, GameState } from './trailhead/types';
import { DIFFICULTIES, LAST_DIFFICULTY_KEY } from './trailhead/types';
import { clearSavedGame, loadSavedGame } from './trailhead/storage';
import { fetchBank, resetGameState, startNewGame } from './trailhead/puzzle';
import { deduceForcedCells, getConflicts, isWin } from './trailhead/validator';
import { bindBoardInteractions, createBoard, renderBoard } from './ui/board';
import {
  bindControlHandlers,
  getSelectedDifficulty,
  setDifficulty,
  setHintEnabled,
  setUndoEnabled,
  showWinBanner,
  updateDifficultyLabel,
  updatePuzzleId,
  updateTimer,
  toggleAdjacencyLabel,
  openHelp,
  closeHelp,
  showToast,
  toggleDrawButton,
} from './ui/controls';
import { bindNumberPad, updateNumberPad } from './ui/number-pad';

class TrailheadApp {
  private state: GameState | null = null;
  private board = createBoard(document.getElementById('board')!);
  private loading = false;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  async init(): Promise<void> {
    // Preload easy puzzles
    fetchBank('easy').catch(() => {});

    bindBoardInteractions(
      this.board,
      (row, col) => this.handleSelect(row, col),
      (row, col) => this.handleLongPress(row, col),
      (row, col) => this.handleDrawStart(row, col),
      (row, col) => this.handleDrawStep(row, col),
      () => this.handleDrawEnd(),
      () => this.getDrawMode(),
    );

    bindControlHandlers({
      onNewGame: () => void this.newGame(),
      onReset: () => this.handleReset(),
      onUndo: () => this.handleUndo(),
      onHelp: openHelp,
      onTrace: () => this.toggleTrace(),
      onDrawToggle: () => this.toggleDrawMode(),
      onDifficultyChange: () => void this.newGame(),
      onHint: () => this.handleHint(),
    });

    bindNumberPad({
      onClear: () => this.handleNumberPadClear(),
      onAutoFill: () => this.handleAutoFill(),
    });

    window.addEventListener('trailhead-number', ((e: CustomEvent<{ value: number }>) => {
      this.handlePlace(e.detail.value);
    }) as EventListener);

    document.getElementById('play-again')?.addEventListener('click', () => void this.newGame());

    document.addEventListener('keydown', (e) => this.handleKeydown(e));

    const saved = loadSavedGame();
    if (saved && !saved.won) {
      this.state = saved;
      setDifficulty(saved.puzzle.id.split('-')[0] as Difficulty);
      this.refresh(false);
    } else {
      const last = localStorage.getItem(LAST_DIFFICULTY_KEY);
      if (last && DIFFICULTIES.includes(last as Difficulty)) {
        setDifficulty(last as Difficulty);
      }
      await this.newGame();
      showToast('New game started! Tap a cell and choose a number.');
    }

    this.startTimer();

    if (!localStorage.getItem('trailhead-has-seen-help')) {
      openHelp();
      localStorage.setItem('trailhead-has-seen-help', '1');
    }
  }

  private hasProgress(): boolean {
    if (!this.state) return false;
    for (let r = 0; r < this.state.puzzle.rows; r++) {
      for (let c = 0; c < this.state.puzzle.cols; c++) {
        const isGiven = this.state.puzzle.givens.some((g) => g.x === c && g.y === r);
        if (!isGiven && this.state.grid[r][c] !== null) return true;
      }
    }
    return false;
  }

  private async newGame(): Promise<void> {
    if (this.loading) return;
    if (this.state && !this.state.won && this.hasProgress()) {
      if (!confirm('A game is in progress. Start a new game?')) return;
    }
    this.loading = true;
    clearSavedGame();
    closeHelp();

    try {
      const difficulty = getSelectedDifficulty();
      localStorage.setItem(LAST_DIFFICULTY_KEY, difficulty);
      this.state = await startNewGame(difficulty);
      toggleDrawButton(this.state.drawMode);
      this.refresh(true);
    } catch (err) {
      console.error(err);
      alert('Could not load a puzzle. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  private handleReset(): void {
    if (!this.state) return;
    if (this.state.history.length === 0) return;
    resetGameState(this.state);
    this.refresh(true);
  }

  private stashUndo(): void {
    if (!this.state || this.state.won) return;
    const snapshot = this.state.grid.map((row) => [...row]);
    this.state.history.push(snapshot);
    if (this.state.history.length > 30) {
      this.state.history.shift();
    }
  }

  private handleSelect(row: number, col: number): void {
    if (!this.state || this.state.won) return;
    if (this.state.selected?.row === row && this.state.selected?.col === col) {
      this.state.selected = null;
    } else {
      this.state.selected = { row, col };
    }
    this.refresh(true);
  }

  private handleLongPress(row: number, col: number): void {
    // Long press on a filled cell shows its neighbors on the number pad by pre-selecting it
    if (!this.state) return;
    this.state.selected = { row, col };
    this.refresh(true);
  }

  private handlePlace(value: number): void {
    if (!this.state || this.state.won || !this.state.selected) return;
    const { row, col } = this.state.selected;
    const isGiven = this.state.puzzle.givens.some((g) => g.x === col && g.y === row);
    if (isGiven) return;
    this.stashUndo();
    this.state.grid[row][col] = value;
    this.refresh(true);
  }

  private handleNumberPadClear(): void {
    if (!this.state || this.state.won || !this.state.selected) return;
    const { row, col } = this.state.selected;
    const isGiven = this.state.puzzle.givens.some((g) => g.x === col && g.y === row);
    if (isGiven) return;
    this.stashUndo();
    this.state.grid[row][col] = null;
    this.refresh(true);
  }

  private handleAutoFill(): void {
    if (!this.state || this.state.won) return;
    this.state.usedAutoFill = true;
    const forced = deduceForcedCells(this.state);
    if (forced.length === 0) return;
    this.stashUndo();
    for (const { row, col, value } of forced) {
      this.state.grid[row][col] = value;
    }
    this.refresh(true);
  }

  private handleHint(): void {
    if (!this.state || this.state.won) return;
    const { puzzle, grid } = this.state;
    const candidates: [number, number, number][] = [];
    for (let r = 0; r < puzzle.rows; r++) {
      for (let c = 0; c < puzzle.cols; c++) {
        if (grid[r][c] === null) {
          const sol = puzzle.solution[r * puzzle.cols + c];
          candidates.push([r, c, sol]);
        }
      }
    }
    if (candidates.length === 0) return;
    const [rr, cc, vv] = candidates[Math.floor(Math.random() * candidates.length)];
    this.stashUndo();
    grid[rr][cc] = vv;
    this.state.hintCount++;
    this.refresh(true);
  }

  private handleUndo(): void {
    if (!this.state || this.state.history.length === 0) return;
    this.state.grid = this.state.history.pop()!;
    this.refresh(true);
  }

  private toggleTrace(): void {
    if (!this.state) return;
    this.state.traceMode = !this.state.traceMode;
    this.refresh(true);
  }

  // ---- Draw mode (drag-to-draw path) ---------------------------
  private drawPath: [number, number][] = [];

  private toggleDrawMode(): void {
    if (!this.state) return;
    this.state.drawMode = !this.state.drawMode;
    toggleDrawButton(this.state.drawMode);
    if (!this.state.drawMode) {
      this.drawPath = [];
    }
  }

  private getDrawMode(): boolean {
    return this.state?.drawMode ?? false;
  }

  private isAdjacent(a: [number, number], b: [number, number]): boolean {
    const { adjacency } = this.state!.puzzle;
    const dr = Math.abs(a[0] - b[0]);
    const dc = Math.abs(a[1] - b[1]);
    if (adjacency === 4) return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
    return dr <= 1 && dc <= 1;
  }

  private handleDrawStart(row: number, col: number): void {
    if (!this.state || this.state.won) return;
    const isGiven = this.state.puzzle.givens.some((g) => g.x === col && g.y === row);
    if (isGiven) return; // never start a draw on a given cell
    this.stashUndo();
    this.drawPath = [[row, col]];
    const nextVal = this.findNextValue();
    if (nextVal !== null) {
      this.state.grid[row][col] = nextVal;
      this.refresh(true);
    }
  }

  private handleDrawStep(row: number, col: number): void {
    if (!this.state || this.state.won || this.drawPath.length === 0) return;
    const last = this.drawPath[this.drawPath.length - 1];
    if (last[0] === row && last[1] === col) return;
    if (!this.isAdjacent(last, [row, col])) return;
    // Prevent loops: disallow revisiting cells already in this drawsession
    if (this.drawPath.some(([r, c]) => r === row && c === col)) return;
    const isGiven = this.state.puzzle.givens.some((g) => g.x === col && g.y === row);
    if (isGiven) return; // never overwrite givens
    const nextVal = this.findNextValue();
    if (nextVal === null) return;
    this.drawPath.push([row, col]);
    this.state.grid[row][col] = nextVal;
    this.refresh(true);
  }

  private handleDrawEnd(): void {
    this.drawPath = [];
  }

  private findNextValue(): number | null {
    if (!this.state) return null;
    const { rows, cols } = this.state.puzzle;
    const N = rows * cols;
    const placed = new Set<number>();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (this.state.grid[r][c] !== null) placed.add(this.state.grid[r][c]!);
      }
    }
    for (let v = 1; v <= N; v++) {
      if (!placed.has(v)) return v;
    }
    return null;
  }

  private handleKeydown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      this.handleUndo();
      return;
    }
    if (e.key === 'Escape') {
      if (this.state) {
        this.state.selected = null;
        this.refresh(true);
      }
      closeHelp();
      return;
    }
    if (!this.state || this.state.won || !this.state.selected) return;
    const { row, col } = this.state.selected;
    const rows = this.state.puzzle.rows;
    const cols = this.state.puzzle.cols;
    switch (e.key) {
      case 'ArrowUp':
        this.state.selected = { row: Math.max(0, row - 1), col };
        this.refresh(true);
        break;
      case 'ArrowDown':
        this.state.selected = { row: Math.min(rows - 1, row + 1), col };
        this.refresh(true);
        break;
      case 'ArrowLeft':
        this.state.selected = { row, col: Math.max(0, col - 1) };
        this.refresh(true);
        break;
      case 'ArrowRight':
        this.state.selected = { row, col: Math.min(cols - 1, col + 1) };
        this.refresh(true);
        break;
      case 'Backspace':
      case 'Delete':
        this.handleNumberPadClear();
        break;
      default:
        if (/^[1-9]$/.test(e.key) && this.state) {
          const val = parseInt(e.key, 10);
          if (val <= this.state.puzzle.rows * this.state.puzzle.cols) {
            this.handlePlace(val);
          }
        }
    }
  }

  private startTimer(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.state && !this.state.won) {
        const total = this.state.elapsed + (Date.now() - this.state.startTime);
        const mins = Math.floor(total / 60000);
        const secs = Math.floor((total % 60000) / 1000);
        updateTimer(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    }, 1000);
  }

  private refresh(render: boolean): void {
    if (!this.state) return;
    if (render) {
      renderBoard(this.board, this.state);
      updateNumberPad(this.state);
    }
    const conflicts = getConflicts(this.state);
    for (let r = 0; r < this.state.puzzle.rows; r++) {
      for (let c = 0; c < this.state.puzzle.cols; c++) {
        const cell = this.board.cells[r]?.[c];
        if (!cell) continue;
        const hasConflict = conflicts.some((conf) => conf.row === r && conf.col === c);
        if (hasConflict) {
          cell.classList.add('conflict');
        } else {
          cell.classList.remove('conflict');
        }
      }
    }

    setUndoEnabled(this.state.history.length > 0);
    setHintEnabled(!this.state.won);
    updatePuzzleId(this.state.puzzle.id);
    updateDifficultyLabel(
      this.state.puzzle.id.split('-')[0].charAt(0).toUpperCase() +
        this.state.puzzle.id.split('-')[0].slice(1),
    );
    toggleAdjacencyLabel(this.state.puzzle.adjacency);

    if (!this.state.won && isWin(this.state)) {
      this.state.won = true;
      this.state.elapsed += Date.now() - this.state.startTime;
      showWinBanner(true);
      clearSavedGame();
      renderBoard(this.board, this.state);
      updateNumberPad(this.state);
    } else if (!this.state.won) {
      showWinBanner(false);
      // Defer save to avoid excessive writes
      // Using simple setTimeout debounce
      const pending = (this as any).__saveDebouncer;
      if (pending) clearTimeout(pending);
      (this as any).__saveDebouncer = setTimeout(() => {
        import('./trailhead/storage').then(({ saveGame }) => {
          saveGame(this.state!);
        });
      }, 500);
    }
  }
}

export async function bootstrap(): Promise<void> {
  const app = new TrailheadApp();
  await app.init();
}
