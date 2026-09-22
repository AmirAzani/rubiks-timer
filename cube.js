// ================================
// RUBIK'S CUBE 2D PREVIEW
// ================================
//
// Cube orientation:
//
//             U (White)
//                ↑
//
//      L       F       R       B
//   Orange    Green    Red    Blue
//              ↓
//             D (Yellow)
//
// F = Front   (Green)
// B = Back    (Blue)
// U = Up      (White)
// D = Down    (Yellow)
// L = Left    (Orange)
// R = Right   (Red)
//
// Face sticker indexing:
//
//   0 1 2
//   3 4 5
//   6 7 8
//
// Face order:
// U, R, F, D, L, B
// ================================


// ================================
// SOLVED CUBE
// ================================

const SOLVED = {
  U: Array(9).fill('W'),
  R: Array(9).fill('R'),
  F: Array(9).fill('G'),
  D: Array(9).fill('Y'),
  L: Array(9).fill('O'),
  B: Array(9).fill('B')
};


// ================================
// CURRENT CUBE STATE
// ================================

let cubeState = null;


// ================================
// RESET CUBE
// ================================

function resetCube() {
  cubeState = JSON.parse(JSON.stringify(SOLVED));
}


// ================================
// PERMUTATION TABLES
// ================================
//
// Each move consists of several 4-sticker
// cycles.
//
// Important:
// applyMoveOnce() moves:
//
//     A → B
//     B → C
//     C → D
//     D → A
//
// Therefore the order of each cycle matters.
//
// ================================

const MOVES_TABLE = {

  // ================================
  // U CLOCKWISE
  // ================================
  //
  // Looking directly at U from above:
  //
  //     F → L
  //     L → B
  //     B → R
  //     R → F
  //
  U: [

    // U face rotation
    [['U', 0], ['U', 2], ['U', 8], ['U', 6]],
    [['U', 1], ['U', 5], ['U', 7], ['U', 3]],

    // Side stickers
    [['R', 0], ['F', 0], ['L', 0], ['B', 0]],
    [['R', 1], ['F', 1], ['L', 1], ['B', 1]],
    [['R', 2], ['F', 2], ['L', 2], ['B', 2]]
  ],


  // ================================
  // R CLOCKWISE
  // ================================
  //
  // U → B → D → F → U
  //
  R: [

    // R face rotation
    [['R', 0], ['R', 2], ['R', 8], ['R', 6]],
    [['R', 1], ['R', 5], ['R', 7], ['R', 3]],

    // Right column
    [['U', 2], ['B', 6], ['D', 2], ['F', 2]],
    [['U', 5], ['B', 3], ['D', 5], ['F', 5]],
    [['U', 8], ['B', 0], ['D', 8], ['F', 8]]
  ],


  // ================================
  // F CLOCKWISE
  // ================================
  //
  // U → R → D → L → U
  //
  F: [

    // F face rotation
    [['F', 0], ['F', 2], ['F', 8], ['F', 6]],
    [['F', 1], ['F', 5], ['F', 7], ['F', 3]],

    // Front surrounding stickers
    [['U', 6], ['R', 0], ['D', 2], ['L', 8]],
    [['U', 7], ['R', 3], ['D', 1], ['L', 5]],
    [['U', 8], ['R', 6], ['D', 0], ['L', 2]]
  ],


  // ================================
  // D CLOCKWISE
  // ================================
  //
  // F → R → B → L → F
  //
  D: [

    // D face rotation
    [['D', 0], ['D', 2], ['D', 8], ['D', 6]],
    [['D', 1], ['D', 5], ['D', 7], ['D', 3]],

    // Bottom rows
    [['R', 6], ['B', 6], ['L', 6], ['F', 6]],
    [['R', 7], ['B', 7], ['L', 7], ['F', 7]],
    [['R', 8], ['B', 8], ['L', 8], ['F', 8]]
  ],


  // ================================
  // L CLOCKWISE
  // ================================
  //
  // U → F → D → B → U
  //
  L: [

    // L face rotation
    [['L', 0], ['L', 2], ['L', 8], ['L', 6]],
    [['L', 1], ['L', 5], ['L', 7], ['L', 3]],

    // Left column
    [['U', 0], ['F', 0], ['D', 0], ['B', 8]],
    [['U', 3], ['F', 3], ['D', 3], ['B', 5]],
    [['U', 6], ['F', 6], ['D', 6], ['B', 2]]
  ],


  // ================================
  // B CLOCKWISE
  // ================================
  //
  // U → L → D → R → U
  //
  B: [

    // B face rotation
    [['B', 0], ['B', 2], ['B', 8], ['B', 6]],
    [['B', 1], ['B', 5], ['B', 7], ['B', 3]],

    // Back surrounding stickers
    [['U', 0], ['L', 6], ['D', 8], ['R', 2]],
    [['U', 1], ['L', 3], ['D', 7], ['R', 5]],
    [['U', 2], ['L', 0], ['D', 6], ['R', 8]]
  ]
};


// ================================
// APPLY ONE CLOCKWISE MOVE
// ================================

function applyMoveOnce(face) {

  const cycles = MOVES_TABLE[face];

  if (!cycles) {
    console.warn(`Unknown move: ${face}`);
    return;
  }

  for (const cycle of cycles) {

    // Save the last sticker
    const last = cycle[cycle.length - 1];

    const lastColor =
      cubeState[last[0]][last[1]];

    // Move each previous sticker
    // into the next position
    for (let i = cycle.length - 1; i > 0; i--) {

      const from = cycle[i - 1];
      const to = cycle[i];

      cubeState[to[0]][to[1]] =
        cubeState[from[0]][from[1]];
    }

    // Last sticker goes into first position
    cubeState[cycle[0][0]][cycle[0][1]] =
      lastColor;
  }
}


// ================================
// APPLY MOVE
// ================================
//
// Supported:
//
// U
// U2
// U'
//
// R
// R2
// R'
//
// etc.
//
// ================================

function applyMove(move) {

  if (!move || typeof move !== 'string') {
    return;
  }

  move = move.trim();

  if (!move) {
    return;
  }

  const face = move[0].toUpperCase();
  const modifier = move.slice(1);

  // Validate face
  if (!MOVES_TABLE[face]) {
    console.warn(`Invalid cube move: ${move}`);
    return;
  }

  let times = 1;

  if (modifier === '2') {
    times = 2;
  }
  else if (modifier === "'") {
    times = 3;
  }
  else if (modifier !== '') {
    console.warn(`Invalid move modifier: ${move}`);
    return;
  }

  for (let i = 0; i < times; i++) {
    applyMoveOnce(face);
  }
}


// ================================
// APPLY SCRAMBLE
// ================================

function applyScramble(scramble) {

  if (!scramble || typeof scramble !== 'string') {
    return;
  }

  const moves = scramble
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  for (const move of moves) {
    applyMove(move);
  }
}


// ================================
// RENDER CUBE
// ================================
//
// Layout:
//
//              U
//
//       L      F      R      B
//
//              D
//
// Grid = 12 columns × 9 rows
//
// ================================

function renderCubeInContainer(container, scramble) {

  if (!container) {
    return;
  }

  // Start from solved state
  resetCube();

  // Apply scramble
  applyScramble(scramble);

  // Clear existing preview
  container.innerHTML = '';

  // --------------------------------
  // Create 12 × 9 grid
  // --------------------------------

  const grid = [];

  for (let r = 0; r < 9; r++) {

    for (let c = 0; c < 12; c++) {

      grid.push({
        r: r,
        c: c,
        color: null
      });

    }
  }


  // --------------------------------
  // Place a face on the grid
  // --------------------------------

  function placeFace(face, rowStart, colStart) {

    for (let i = 0; i < 9; i++) {

      const row =
        rowStart + Math.floor(i / 3);

      const col =
        colStart + (i % 3);

      const cell =
        grid.find(g =>
          g.r === row &&
          g.c === col
        );

      if (cell) {
        cell.color =
          cubeState[face][i];
      }
    }
  }


  // --------------------------------
  // Place all six faces
  // --------------------------------

  placeFace('U', 0, 3);

  placeFace('L', 3, 0);

  placeFace('F', 3, 3);

  placeFace('R', 3, 6);

  // IMPORTANT:
  // Do NOT mirror B here.
  placeFace('B', 3, 9);

  placeFace('D', 6, 3);


  // --------------------------------
  // Render stickers
  // --------------------------------

  grid.forEach(cell => {

    const div =
      document.createElement('div');

    if (cell.color) {

      div.className =
        `sticker ${cell.color}`;

    }
    else {

      div.style.visibility =
        'hidden';
    }

    container.appendChild(div);
  });
}


// ================================
// MAIN RENDER FUNCTION
// ================================
//
// Uses currentScramble from script.js
//
// ================================

function renderCube() {

  const container =
    document.getElementById('cube');

  if (!container) {
    return;
  }

  // currentScramble should be supplied
  // by script.js
  renderCubeInContainer(
    container,
    currentScramble || ''
  );
}


// ================================
// PUBLIC API
// ================================
//
// Call this from script.js:
//
// updateCubeFromScramble("R U R' U'");
//
// ================================

function updateCubeFromScramble(scramble) {

  // Make sure the global scramble
  // is updated BEFORE rendering.
  currentScramble = scramble || '';

  renderCube();
}


// ================================
// DEBUG / TEST FUNCTIONS
// ================================
//
// These are optional but useful for
// checking whether the cube returns
// to solved after four identical moves.
// ================================

function getCubeStateCopy() {

  return JSON.parse(
    JSON.stringify(cubeState)
  );
}


function isCubeSolved() {

  for (const face of ['U', 'R', 'F', 'D', 'L', 'B']) {

    const expected =
      SOLVED[face][0];

    for (let i = 0; i < 9; i++) {

      if (cubeState[face][i] !== expected) {
        return false;
      }
    }
  }

  return true;
}


// ================================
// TEST A SINGLE MOVE FOUR TIMES
// ================================

function testFourMoves(face) {

  resetCube();

  for (let i = 0; i < 4; i++) {
    applyMove(face);
  }

  const result = isCubeSolved();

  console.log(
    `${face} × 4 →`,
    result ? 'PASS' : 'FAIL'
  );

  return result;
}


// ================================
// TEST ALL BASIC MOVES
// ================================

function testAllMoves() {

  const faces =
    ['U', 'R', 'F', 'D', 'L', 'B'];

  const results = {};

  for (const face of faces) {
    results[face] =
      testFourMoves(face);
  }

  console.table(results);

  return results;
}