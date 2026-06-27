import type { Difficulty } from '../trailhead/types';

export function bindControlHandlers(handlers: {
  onNewGame: () => void;
  onReset: () => void;
  onUndo: () => void;
  onHelp: () => void;
  onTrace: () => void;
  onDrawToggle: () => void;
  onDifficultyChange: () => void;
  onHint: () => void;
}): void {
  document.getElementById('new-game')?.addEventListener('click', handlers.onNewGame);
  document.getElementById('reset')?.addEventListener('click', handlers.onReset);
  document.getElementById('undo')?.addEventListener('click', handlers.onUndo);
  document.getElementById('help')?.addEventListener('click', handlers.onHelp);
  document.getElementById('trace')?.addEventListener('click', handlers.onTrace);
  document.getElementById('draw')?.addEventListener('click', handlers.onDrawToggle);
  document.getElementById('difficulty')?.addEventListener('change', handlers.onDifficultyChange);
  document.getElementById('hint')?.addEventListener('click', handlers.onHint);
}

export function toggleDrawButton(active: boolean): void {
  const btn = document.getElementById('draw');
  if (!btn) return;
  if (active) {
    btn.classList.add('active-draw');
    btn.textContent = '🎨 Draw On';
  } else {
    btn.classList.remove('active-draw');
    btn.textContent = '🎨 Draw';
  }
}

export function getSelectedDifficulty(): Difficulty {
  const el = document.getElementById('difficulty') as HTMLSelectElement;
  return (el?.value || 'easy') as Difficulty;
}

export function setDifficulty(d: Difficulty): void {
  const el = document.getElementById('difficulty') as HTMLSelectElement | null;
  if (el) el.value = d;
}

export function setUndoEnabled(enabled: boolean): void {
  const el = document.getElementById('undo') as HTMLButtonElement | null;
  if (el) el.disabled = !enabled;
}

export function setHintEnabled(enabled: boolean): void {
  const el = document.getElementById('hint') as HTMLButtonElement | null;
  if (el) el.disabled = !enabled;
}

export function updateDifficultyLabel(text: string): void {
  const el = document.getElementById('difficulty-label');
  if (el) el.textContent = text;
}

export function updatePuzzleId(id: string): void {
  const el = document.getElementById('puzzle-id');
  if (el) el.textContent = `ID: ${id}`;
}

export function toggleAdjacencyLabel(adjacency: number): void {
  const el = document.getElementById('adjacency-toggle');
  if (el) el.textContent = `${adjacency}-way`;
}

export function showWinBanner(show: boolean): void {
  const el = document.getElementById('win-banner');
  if (el) el.classList.toggle('hidden', !show);
}

export function showToast(message: string): void {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  const timeout = window.setTimeout(() => {
    toast.remove();
    window.clearTimeout(timeout);
  }, 2200);
}

function removeHelp(): void {
  const dialog = document.getElementById('help-dialog');
  if (dialog) dialog.remove();
}

export function openHelp(): void {
  removeHelp();
  const overlay = document.createElement('div');
  overlay.id = 'help-dialog';
  overlay.className = 'help-overlay';
  overlay.innerHTML = `
    <div class="help-inner">
      <h2>How to play Trailhead</h2>
      <p>Fill the grid with a continuous trail of numbers from 1 to N (where N is the number of cells). Each number must be adjacent to the next in sequence.</p>
      <ul>
        <li>The grid does <strong>not wrap</strong>. Moving off an edge does not continue on the opposite side.</li>
        <li><strong>Tap</strong> a cell, then choose a number from the pad.</li>
        <li><strong>Undo</strong> reverts your last placement(s).</li>
        <li><strong>Trace</strong> draws lines between all placed consecutive numbers.</li>
        <li><strong>Hint</strong> reveals one correct cell.</li>
      </ul>

      <h3>🎨 Draw mode</h3>
      <p>Use the <strong>🎨 Draw</strong> button to toggle between <em>tap</em> and <em>drag</em> input:</p>
      <ul>
        <li><strong>Draw mode</strong> (default): click and drag from an empty cell. The game auto-fills numbers as you trace the trail.</li>
        <li><strong>Tap mode</strong>: select a cell, then pick a number.</li>
        <li>Givens cannot be overwritten — the draw simply won't start on those cells.</li>
        <li><strong>Undo</strong> reverts an entire drag stroke at once.</li>
      </ul>

      <h3>Example trail (4×4)</h3>
      <p class="help-caption">Start at the gold <strong>1</strong> cell, follow the trail to the green <strong>16</strong> cell.</p>
      <div class="help-example">
        <div class="help-grid" style="grid-template-columns:repeat(4,1fr)">
          <div class="help-cell trail-start">1</div>
          <div class="help-cell">2</div>
          <div class="help-cell">3</div>
          <div class="help-cell">4</div>
          <div class="help-cell">8</div>
          <div class="help-cell">7</div>
          <div class="help-cell">6</div>
          <div class="help-cell">5</div>
          <div class="help-cell">9</div>
          <div class="help-cell">10</div>
          <div class="help-cell">11</div>
          <div class="help-cell">12</div>
          <div class="help-cell trail-end">16</div>
          <div class="help-cell">15</div>
          <div class="help-cell">14</div>
          <div class="help-cell">13</div>
        </div>
      </div>

      <h3>Rules</h3>
      <ul>
        <li>Every number k must be adjacent (4-way or 8-way depending on difficulty) to both k–1 and k+1.</li>
        <li>Givens are fixed; you cannot change them.</li>
      </ul>
      <p>Numbers surrounded in red conflict with adjacency or uniqueness constraints.</p>
      <button type="button" id="close-help" class="btn btn-primary" style="margin-top:8px">Got it</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('close-help')?.addEventListener('click', removeHelp);
}

export function closeHelp(): void {
  removeHelp();
}
