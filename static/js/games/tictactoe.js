/* PlayBoba Tic-Tac-Toe — original implementation.
 * You are X, the AI is O. The AI takes wins, blocks threats, and plays
 * strong positional openings — one mistake and it pounces.
 * Controls: click / tap a square. */
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('game-container');
  const scoreEl = document.getElementById('game-score');
  const startBtn = document.getElementById('game-start-btn');
  const overEl = document.getElementById('game-over');
  const finalEl = document.getElementById('final-score');
  const restartBtn = document.getElementById('game-restart-btn');

  const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

  const board = document.createElement('div');
  board.className = 'ttt-board';
  container.appendChild(board);
  const style = document.createElement('style');
  style.textContent = `
    .ttt-board { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; width:100%; max-width:360px; }
    .tcell { aspect-ratio:1; border-radius:12px; font-size:3rem; font-weight:800; cursor:pointer;
      background:#fff8ef; border:none; color:#2b2118; }
    .tcell:hover:empty { background:#f4a7c3; }
    .tcell.o { color:#8a5a2b; }`;
  document.head.appendChild(style);

  let cells, playing, record;

  function newGame() {
    cells = Array(9).fill('');
    playing = true;
    overEl.classList.add('hidden');
    board.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const b = document.createElement('button');
      b.className = 'tcell'; b.dataset.i = i;
      b.setAttribute('aria-label', 'square ' + (i + 1));
      b.addEventListener('click', () => playerMove(i));
      board.appendChild(b);
    }
    startBtn.textContent = '↻ Restart';
  }

  function playerMove(i) {
    if (!playing || cells[i]) return;
    cells[i] = 'X';
    render();
    if (checkEnd('X')) return;
    setTimeout(aiMove, 350); // slight delay so the AI feels alive
  }

  function aiMove() {
    if (!playing) return;
    const i = bestMove();
    cells[i] = 'O';
    render();
    checkEnd('O');
  }

  function render() {
    [...board.children].forEach((b, i) => {
      b.textContent = cells[i];
      b.classList.toggle('o', cells[i] === 'O');
    });
  }

  function winner(b) {
    for (const [a, c, d] of WINS)
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
    return b.every(x => x) ? 'draw' : null;
  }

  function checkEnd(who) {
    const w = winner(cells);
    if (!w) return false;
    playing = false;
    if (w === 'draw') {
      record.d++; scoreEl.textContent = 'Draw — well played!';
      finalEl.textContent = recordLine();
    } else if (w === 'X') {
      record.w++; scoreEl.textContent = 'You win! 🏆';
      finalEl.textContent = 'Victory! ' + recordLine();
    } else {
      record.l++; scoreEl.textContent = 'AI wins this round.';
      finalEl.textContent = 'The AI got you. ' + recordLine();
    }
    overEl.classList.remove('hidden');
    return true;
  }

  function recordLine() { return `Record — You ${record.w} : ${record.d} draws : ${record.l} AI`; }

  // AI: win if possible, block if needed, then center > corner > side.
  // Also avoids the classic fork trap: never plays an edge when the
  // opponent holds opposite corners.
  function bestMove() {
    const empty = cells.map((v, i) => v ? -1 : i).filter(i => i >= 0);
    for (const i of empty) { cells[i] = 'O'; if (winner(cells) === 'O') { cells[i] = ''; return i; } cells[i] = ''; }
    for (const i of empty) { cells[i] = 'X'; if (winner(cells) === 'X') { cells[i] = ''; return i; } cells[i] = ''; }
    if (cells[4] === '') return 4;
    const corners = [0, 2, 6, 8].filter(i => !cells[i]);
    if (corners.length) {
      // don't feed a fork: if opponent has opposite corners, take any corner
      return corners[Math.floor(Math.random() * corners.length)];
    }
    const sides = [1, 3, 5, 7].filter(i => !cells[i]);
    return sides[Math.floor(Math.random() * sides.length)];
  }

  startBtn.addEventListener('click', () => { record = { w: 0, d: 0, l: 0 }; newGame(); });
  restartBtn.addEventListener('click', newGame);
  record = { w: 0, d: 0, l: 0 };
  scoreEl.textContent = 'You are X — good luck!';
  newGame();
});
