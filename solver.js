// ================================
// AI CUBE SOLVER — FRONTEND
// ================================

// Face order: U, R, F, D, L, B
// Layout in 12×9 grid:
//       U (row 0, col 3)
// L  F  R  B (row 3, cols 0, 3, 6, 9)
//       D (row 6, col 3)

const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];

const FACE_POSITIONS = {
  U: { row: 0, col: 3 },
  L: { row: 3, col: 0 },
  F: { row: 3, col: 3 },
  R: { row: 3, col: 6 },
  B: { row: 3, col: 9 },
  D: { row: 6, col: 3 }
};

// ⚠️ Live Render API URL
const API_URL = 'https://rubiks-ai-solver-o9gm.onrender.com/solve';

// ================================
// STATE
// ================================
let cubeState = {};
let selectedColor = 'W';

// ================================
// DOM
// ================================
const cubeInputEl     = document.getElementById('cubeInput');
const solveBtn        = document.getElementById('solveBtn');
const resetInputBtn   = document.getElementById('resetInputBtn');
const fillSolvedBtn   = document.getElementById('fillSolvedBtn');
const solverStatus    = document.getElementById('solverStatus');
const resultBox       = document.getElementById('resultBox');
const solutionMoves   = document.getElementById('solutionMoves');
const copySolutionBtn = document.getElementById('copySolutionBtn');

// ================================
// INIT
// ================================
function initCubeState() {
  cubeState = {};
  FACE_ORDER.forEach(face => {
    cubeState[face] = Array(9).fill(null);
  });
}

function renderInputGrid() {
  cubeInputEl.innerHTML = '';

  const grid = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 12; c++) {
      grid.push({ r, c, face: null, index: null });
    }
  }

  FACE_ORDER.forEach(face => {
    const pos = FACE_POSITIONS[face];
    for (let i = 0; i < 9; i++) {
      const r = pos.row + Math.floor(i / 3);
      const c = pos.col + (i % 3);
      const cell = grid.find(g => g.r === r && g.c === c);
      if (cell) {
        cell.face = face;
        cell.index = i;
      }
    }
  });

  grid.forEach(cell => {
    const div = document.createElement('div');
    if (cell.face) {
      div.className = 'input-sticker empty';
      div.dataset.face = cell.face;
      div.dataset.index = cell.index;
      div.addEventListener('click', () => paintSticker(cell.face, cell.index));
    } else {
      div.style.visibility = 'hidden';
    }
    cubeInputEl.appendChild(div);
  });

  refreshStickerColors();
}

function refreshStickerColors() {
  cubeInputEl.querySelectorAll('.input-sticker').forEach(el => {
    const face = el.dataset.face;
    const index = parseInt(el.dataset.index);
    const color = cubeState[face][index];

    el.classList.remove('W', 'Y', 'G', 'B', 'O', 'R', 'empty');

    if (color) {
      el.classList.add(color);
    } else {
      el.classList.add('empty');
    }
  });

  updateProgress();
}

function paintSticker(face, index) {
  cubeState[face][index] = selectedColor;
  refreshStickerColors();
}

// ================================
// PALETTE
// ================================
document.querySelectorAll('.color-swatch').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedColor = btn.dataset.color;
  });
});

// ================================
// PROGRESS + SOLVE ENABLE
// ================================
function countFilled() {
  let count = 0;
  FACE_ORDER.forEach(face => {
    cubeState[face].forEach(c => { if (c) count++; });
  });
  return count;
}

function updateProgress() {
  const filled = countFilled();
  const total = 54;

  solverStatus.textContent = filled === total
    ? 'All stickers filled! Ready to solve.'
    : `Fill all 54 stickers to enable solving. ${filled} / ${total}`;

  solveBtn.disabled = filled !== total;
}

// ================================
// RESET / FILL SOLVED
// ================================
resetInputBtn.addEventListener('click', () => {
  initCubeState();
  refreshStickerColors();
  resultBox.classList.add('hidden');
});

fillSolvedBtn.addEventListener('click', () => {
  const solved = { U: 'W', R: 'R', F: 'G', D: 'Y', L: 'O', B: 'B' };
  FACE_ORDER.forEach(face => {
    cubeState[face] = Array(9).fill(solved[face]);
  });
  refreshStickerColors();
  resultBox.classList.add('hidden');
});

// ================================
// CONVERT TO FACELETS
// ================================
// Colors → Faces (WCA standard)
// W=U, R=R, G=F, Y=D, O=L, B=B
function colorToFace(color) {
  const map = { W: 'U', R: 'R', G: 'F', Y: 'D', O: 'L', B: 'B' };
  return map[color];
}

function toFacelets() {
  let result = '';
  FACE_ORDER.forEach(face => {
    cubeState[face].forEach(color => {
      result += colorToFace(color);
    });
  });
  return result;
}

// ================================
// SOLVE
// ================================
solveBtn.addEventListener('click', async () => {
  const facelets = toFacelets();

  solverStatus.textContent = 'Solving... this may take a moment.';
  solveBtn.disabled = true;
  resultBox.classList.add('hidden');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facelets })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || 'Solver failed');
    }

    let solution = (data.solution || '').trim();
    if (!solution) {
      throw new Error('No solution returned');
    }

    solutionMoves.textContent = solution;
    resultBox.classList.remove('hidden');
    solverStatus.textContent = 'Solved!';

  } catch (err) {
    solverStatus.textContent = 'Error: ' + err.message;
    console.error(err);
  } finally {
    solveBtn.disabled = false;
  }
});

// ================================
// COPY SOLUTION
// ================================
copySolutionBtn.addEventListener('click', () => {
  const text = solutionMoves.textContent;
  navigator.clipboard.writeText(text).then(() => {
    copySolutionBtn.textContent = 'Copied!';
    setTimeout(() => {
      copySolutionBtn.textContent = 'Copy Solution';
    }, 1500);
  });
});

// ================================
// INIT
// ================================
initCubeState();
renderInputGrid();