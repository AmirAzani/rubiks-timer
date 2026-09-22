// ================================
// CONFIG
// ================================
const MOVES = ['R', 'L', 'U', 'D', 'F', 'B'];
const MODIFIERS = ['', "'", '2'];
const SCRAMBLE_LENGTH = 20;

// Opposite face pairs (can't have these consecutively)
const OPPOSITE = {
  R: 'L', L: 'R',
  U: 'D', D: 'U',
  F: 'B', B: 'F'
};

// ================================
// DOM ELEMENTS
// ================================
const scrambleEl    = document.getElementById('scramble');
const newScrambleBtn = document.getElementById('newScrambleBtn');
const timerEl       = document.getElementById('timer');
const timerBox      = document.getElementById('timerBox');
const statusEl      = document.getElementById('status');
const bestEl        = document.getElementById('best');
const lastEl        = document.getElementById('last');
const countEl       = document.getElementById('count');
const historyEl     = document.getElementById('history');
const ao5El         = document.getElementById('ao5');
const ao12El        = document.getElementById('ao12');
const resetBtn = document.getElementById('resetBtn');
const modalEl          = document.getElementById('modal');
const modalClose       = document.getElementById('modalClose');
const modalCloseBtn    = document.getElementById('modalCloseBtn');
const modalLoad        = document.getElementById('modalLoad');
const modalSolveNumber = document.getElementById('modalSolveNumber');
const modalTime        = document.getElementById('modalTime');
const modalDate        = document.getElementById('modalDate');
const modalScramble    = document.getElementById('modalScramble');
const modalCube        = document.getElementById('modalCube');

// ================================
// STATE
// ================================
let currentScramble = '';
let history = [];          // { time, scramble, isPB }
let bestTime = null;

let timerState = 'idle';   // idle | holding | running
let startTime = 0;
let elapsed = 0;
let timerInterval = null;
let holdTimeout = null;

const READY_DELAY = 500;   // hold this long → armed (green)

// ================================
// SCRAMBLE GENERATOR
// ================================
function generateScramble() {
  const scramble = [];
  let prevFace = '';
  let prevPrevFace = '';

  while (scramble.length < SCRAMBLE_LENGTH) {
    // Pick a random face
    const face = MOVES[Math.floor(Math.random() * MOVES.length)];

    // Rule 1: No same face twice in a row
    if (face === prevFace) continue;

    // Rule 2: No opposite face after the same face (e.g. R L R)
    if (face === prevPrevFace && OPPOSITE[face] === prevFace) continue;

    // Pick a random modifier
    const mod = MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)];
    scramble.push(face + mod);

    // Update history
    prevPrevFace = prevFace;
    prevFace = face;
  }

  return scramble.join(' ');
}

// ================================
// TIMER
// ================================
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = ms % 1000;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

function updateTimerDisplay() {
  if (timerState === 'running') {
    elapsed = Date.now() - startTime;
    timerEl.textContent = formatTime(elapsed);
  }
}

function startTimer() {
  timerState = 'running';
  startTime = Date.now();
  elapsed = 0;
  timerEl.classList.remove('ready', 'holding');
  timerEl.classList.add('running');
  statusEl.textContent = 'Press SPACE / tap to stop';
  timerInterval = setInterval(updateTimerDisplay, 10);
}
function stopTimer() {
  clearInterval(timerInterval);
  timerState = 'idle';
  elapsed = Date.now() - startTime;
  timerEl.textContent = formatTime(elapsed);
  timerEl.classList.remove('running');
  statusEl.textContent = 'Hold SPACE or tap & hold';

  saveSolve(elapsed, currentScramble);


    // Load a new scramble for the next solve
  currentScramble = generateScramble();
  scrambleEl.textContent = currentScramble;
  updateCubeFromScramble(currentScramble);
}

function resetTimer() {
  timerState = 'idle';
  elapsed = 0;
  timerEl.textContent = '00:00.000';
  timerEl.classList.remove('ready', 'running', 'holding');
  statusEl.textContent = 'Hold SPACE or press & hold';
}
// ================================
// PRESS HANDLERS (shared by key + touch)
// ================================

function pressStart() {
  if (timerState !== 'idle') return;

  timerState = 'holding';
  timerEl.classList.remove('ready');
  timerEl.classList.add('holding');
  statusEl.textContent = 'Keep holding...';

  // Arm the timer after READY_DELAY
  holdTimeout = setTimeout(() => {
    if (timerState === 'holding') {
      timerState = 'ready';
      timerEl.classList.remove('holding');
      timerEl.classList.add('ready');
      statusEl.textContent = 'Release to start!';
    }
  }, READY_DELAY);
}

function pressEnd() {
  clearTimeout(holdTimeout);

  if (timerState === 'ready') {
    // Green: start the timer
    startTimer();
  }
  else if (timerState === 'holding') {
    // Red: cancelled — didn't hold long enough
    timerState = 'idle';
    timerEl.classList.remove('holding');
    statusEl.textContent = 'Hold SPACE or press & hold';
  }
}

// ================================
// KEYBOARD CONTROLS
// ================================
document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  e.preventDefault();
  if (e.repeat) return;

  if (timerState === 'idle') {
    pressStart();
  }
  else if (timerState === 'running') {
    stopTimer();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code !== 'Space') return;
  e.preventDefault();

  if (timerState === 'holding' || timerState === 'ready') {
    pressEnd();
  }
});
// ================================
// TOUCH / MOUSE CONTROLS
// ================================
timerBox.addEventListener('pointerdown', (e) => {
  e.preventDefault();

  if (timerState === 'idle') {
    pressStart();
  }
  else if (timerState === 'running') {
    stopTimer();
  }
});

timerBox.addEventListener('pointerup', (e) => {
  e.preventDefault();

  if (timerState === 'holding' || timerState === 'ready') {
    pressEnd();
  }
});

// Safety: cancel if pointer leaves the box
timerBox.addEventListener('pointercancel', () => {
  clearTimeout(holdTimeout);

  if (timerState === 'holding' || timerState === 'ready') {
    timerState = 'idle';
    timerEl.classList.remove('holding', 'ready');
    statusEl.textContent = 'Hold SPACE or press & hold';
  }
});

timerBox.addEventListener('pointerleave', () => {
  if (timerState === 'holding' || timerState === 'ready') {
    clearTimeout(holdTimeout);
    timerState = 'idle';
    timerEl.classList.remove('holding', 'ready');
    statusEl.textContent = 'Hold SPACE or press & hold';
  }
});
// ================================
// STORAGE
// ================================
function saveSolve(time, scramble) {
  const isPB = bestTime === null || time < bestTime;
  if (isPB) bestTime = time;

    history.unshift({ time, scramble, isPB, date: Date.now() });

  // Keep only last 50 solves
  if (history.length > 50) history.pop();

  localStorage.setItem('cubeTimer_history', JSON.stringify(history));
  localStorage.setItem('cubeTimer_best', bestTime);

  updateStats();
  renderHistory();
}

function loadFromStorage() {
  const savedHistory = localStorage.getItem('cubeTimer_history');
  const savedBest = localStorage.getItem('cubeTimer_best');

  if (savedHistory) history = JSON.parse(savedHistory);
  if (savedBest) bestTime = parseInt(savedBest);

  updateStats();
  renderHistory();
}

// ================================
// UI UPDATES
// ================================
function updateStats() {
  bestEl.textContent = bestTime ? formatTime(bestTime) : '--';
  lastEl.textContent = history.length > 0 ? formatTime(history[0].time) : '--';
  countEl.textContent = history.length;

  const ao5 = calculateAverage(5);
  const ao12 = calculateAverage(12);
  ao5El.textContent = ao5 ? formatTime(ao5) : '--';
  ao12El.textContent = ao12 ? formatTime(ao12) : '--';
}
function renderHistory() {
  if (history.length === 0) {
    historyEl.innerHTML = '<div class="history-empty">No solves yet. Hold SPACE or tap & hold!</div>';
    return;
  }

  historyEl.innerHTML = history.map((item, index) => `
    <div class="history-item ${item.isPB ? 'pb' : ''}" data-index="${index}">
      <span class="history-time">${formatTime(item.time)}</span>
      ${item.isPB ? '<span class="pb-badge">PB</span>' : ''}
      <span class="history-scramble">${item.scramble}</span>
    </div>
  `).join('');

  // Click to open modal
  historyEl.querySelectorAll('.history-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.index);
      openModal(idx);
    });
  });
}

// ================================
// BUTTON
// ================================
newScrambleBtn.addEventListener('click', () => {
  currentScramble = generateScramble();
  scrambleEl.textContent = currentScramble;
  updateCubeFromScramble(currentScramble);
  resetTimer();
});
// ================================
// RESET SESSION
// ================================
resetBtn.addEventListener('click', () => {
  const confirmed = confirm(
    'Reset session?\n\nThis will permanently delete:\n' +
    '• All solve history\n' +
    '• Best time\n' +
    '• Ao5 and Ao12\n\n' +
    'This cannot be undone.'
  );
  if (!confirmed) return;

  // Clear state
  history = [];
  bestTime = null;

  // Clear storage
  localStorage.removeItem('cubeTimer_history');
  localStorage.removeItem('cubeTimer_best');

  // Reset timer
  resetTimer();

  // Refresh UI
  updateStats();
  renderHistory();

  // Optional: new scramble for a fresh start
  currentScramble = generateScramble();
  scrambleEl.textContent = currentScramble;
  updateCubeFromScramble(currentScramble);

  statusEl.textContent = 'Session reset — Hold SPACE or tap & hold';
});
// ================================
// MODAL
// ================================
let currentModalIndex = null;

function openModal(index) {
  const item = history[index];
  if (!item) return;

  currentModalIndex = index;

  // Fill content
  modalSolveNumber.textContent = `SOLVE #${history.length - index}`;
  modalTime.textContent = formatTime(item.time);
  modalDate.textContent = item.date
    ? new Date(item.date).toLocaleString()
    : 'Date unknown (old solve)';
  modalScramble.textContent = item.scramble;

  // Render cube in modal (using a temporary cube state)
  renderCubeInContainer(modalCube, item.scramble);

  // Show modal
  modalEl.classList.remove('hidden');
}

function closeModal() {
  modalEl.classList.add('hidden');
  currentModalIndex = null;
}

// Close buttons
modalClose.addEventListener('click', closeModal);
modalCloseBtn.addEventListener('click', closeModal);

// Click outside card to close
modalEl.addEventListener('click', (e) => {
  if (e.target === modalEl) closeModal();
});

// Esc key to close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modalEl.classList.contains('hidden')) {
    closeModal();
  }
});

// Load scramble from modal
modalLoad.addEventListener('click', () => {
  if (currentModalIndex === null) return;
  const item = history[currentModalIndex];

  currentScramble = item.scramble;
  scrambleEl.textContent = item.scramble;
  updateCubeFromScramble(item.scramble);
  resetTimer();
  statusEl.textContent = 'Scramble loaded — Hold SPACE or tap & hold';

  closeModal();
});
// ================================
// INIT
// ================================
function init() {
  currentScramble = generateScramble();
  scrambleEl.textContent = currentScramble;
  updateCubeFromScramble(currentScramble);
  loadFromStorage();
}

init();
// ================================
// AVERAGE CALCULATIONS (WCA style)
// ================================
// WCA rule: remove best and worst, average the rest.
// "Best" = lowest time, "worst" = highest time.

function calculateAverage(n) {
  if (history.length < n) return null;

  // Take the most recent N solves
  const recent = history.slice(0, n).map(item => item.time);

  // Sort ascending
  const sorted = [...recent].sort((a, b) => a - b);

  // Remove best (first) and worst (last)
  const trimmed = sorted.slice(1, -1);

  // Average the rest
  const sum = trimmed.reduce((acc, t) => acc + t, 0);
  return Math.round(sum / trimmed.length);
}