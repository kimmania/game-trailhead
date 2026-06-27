import type { GameState } from '../trailhead/types';

export function updateNumberPad(state: GameState): void {
  const header = document.getElementById('number-pad-header');
  const gridEl = document.getElementById('number-pad-grid');
  const clearBtn = document.getElementById('np-clear') as HTMLButtonElement | null;

  if (!header || !gridEl) return;

  const { puzzle, grid, selected, won } = state;
  if (!selected || won) {
    header.textContent = 'Select a cell';
    gridEl.innerHTML = '';
    if (clearBtn) clearBtn.disabled = true;
    return;
  }

  if (clearBtn) clearBtn.disabled = false;

  const { row, col } = selected;
  const isGiven = puzzle.givens.some((g) => g.x === col && g.y === row);
  if (isGiven) {
    header.textContent = `Given: ${grid[row][col]}`;
    gridEl.innerHTML = '';
    if (clearBtn) clearBtn.disabled = true;
    return;
  }

  header.textContent = `Cell (${row + 1}, ${col + 1})`;
  gridEl.innerHTML = '';
  const N = puzzle.rows * puzzle.cols;
  const used = new Set<number>();
  for (let r = 0; r < puzzle.rows; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      if (grid[r][c] !== null) used.add(grid[r][c]!);
    }
  }

  for (let v = 1; v <= N; v++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'np-btn';
    btn.textContent = String(v);
    if (used.has(v)) {
      btn.classList.add('used');
    }
    if (grid[row][col] === v) {
      btn.classList.add('active');
    }
    btn.addEventListener('click', () => {
      if (state.won) return;
      // Triggered via main app event bubbling
      const ev = new CustomEvent('trailhead-number', { detail: { value: v } });
      window.dispatchEvent(ev);
    });
    gridEl.appendChild(btn);
  }
}

export function bindNumberPad(handlers: {
  onClear: () => void;
}): void {
  document.getElementById('np-clear')?.addEventListener('click', handlers.onClear);
}
