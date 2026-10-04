/* PlayBoba 2048 — original implementation.
 * Slide tiles on a 4x4 grid; matching tiles merge. Reach 2048 to win.
 * Controls: arrow keys / WASD on desktop, swipe on touch devices. */
document.addEventListener('DOMContentLoaded', () => {
  const SIZE = 4, CELL = 110, GAP = 12, BOARD = SIZE * CELL + (SIZE + 1) * GAP;
  const container = document.getElementById('game-container');
  const scoreEl = document.getElementById('game-score');
  const startBtn = document.getElementById('game-start-btn');
  const overEl = document.getElementById('game-over');
  const finalEl = document.getElementById('final-score');
  const restartBtn = document.getElementById('game-restart-btn');

  const canvas = document.createElement('canvas');
  canvas.width = BOARD; canvas.height = BOARD;
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const COLORS = { 2:'#eee4da',4:'#ede0c8',8:'#f2b179',16:'#f59563',32:'#f67c5f',
    64:'#f65e3b',128:'#edcf72',256:'#edcc61',512:'#edc850',1024:'#edc53f',
    2048:'#edc22e',4096:'#3c3a32',8192:'#3c3a32' };

  let grid, score, playing, won;

  function emptyGrid() { return Array.from({length: SIZE}, () => Array(SIZE).fill(0)); }

  function randomTile() {
    const empties = [];
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++)
      if (!grid[r][c]) empties.push([r, c]);
    if (!empties.length) return;
    const [r, c] = empties[Math.floor(Math.random() * empties.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function newGame() {
    grid = emptyGrid(); score = 0; playing = true; won = false;
    overEl.classList.add('hidden');
    randomTile(); randomTile();
    updateScore(); draw();
    startBtn.textContent = '↻ Restart';
  }

  function updateScore() { scoreEl.textContent = 'Score: ' + score; }

  // Slide + merge one row to the left; returns {row, gained, moved}
  function slideRow(row) {
    const vals = row.filter(v => v);
    let gained = 0;
    for (let i = 0; i < vals.length - 1; i++) {
      if (vals[i] === vals[i + 1]) { vals[i] *= 2; gained += vals[i]; vals.splice(i + 1, 1); }
    }
    while (vals.length < SIZE) vals.push(0);
    return { row: vals, gained, moved: vals.some((v, i) => v !== row[i]) };
  }

  function rotateCW(g) { // rotate grid 90° clockwise
    return g[0].map((_, c) => g.map(row => row[c]).reverse());
  }

  function move(dir) { // 0=left 1=up 2=right 3=down
    if (!playing) return;
    // CW rotations needed to turn this direction into "slide left":
    // left=0, up=3 (CCW once), right=2, down=1
    const rots = [0, 3, 2, 1][dir];
    let g = grid, moved = false, gained = 0;
    for (let i = 0; i < rots; i++) g = rotateCW(g);
    g = g.map(row => {
      const r = slideRow(row);
      moved = moved || r.moved; gained += r.gained;
      return r.row;
    });
    for (let i = 0; i < (4 - rots) % 4; i++) g = rotateCW(g);
    if (!moved) return;
    grid = g; score += gained;
    if (!won && grid.flat().some(v => v >= 2048)) { won = true; }
    randomTile(); updateScore(); draw();
    if (!canMove()) endGame();
  }

  function canMove() {
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      if (!grid[r][c]) return true;
      if (c + 1 < SIZE && grid[r][c] === grid[r][c + 1]) return true;
      if (r + 1 < SIZE && grid[r][c] === grid[r + 1][c]) return true;
    }
    return false;
  }

  function endGame() {
    playing = false;
    finalEl.textContent = score + (won ? ' — you reached 2048! 🎉' : '');
    overEl.classList.remove('hidden');
  }

  function draw() {
    ctx.fillStyle = '#bbada0';
    ctx.fillRect(0, 0, BOARD, BOARD);
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      const x = GAP + c * (CELL + GAP), y = GAP + r * (CELL + GAP), v = grid[r][c];
      ctx.fillStyle = v ? (COLORS[v] || '#3c3a32') : 'rgba(238,228,218,.35)';
      roundRect(x, y, CELL, CELL, 8); ctx.fill();
      if (v) {
        ctx.fillStyle = v <= 4 ? '#776e65' : '#f9f6f2';
        ctx.font = 'bold ' + (v < 100 ? 44 : v < 1000 ? 38 : 30) + 'px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(v, x + CELL / 2, y + CELL / 2 + 2);
      }
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // keyboard
  document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    const map = { arrowleft: 0, a: 0, arrowup: 1, w: 1, arrowright: 2, d: 2, arrowdown: 3, s: 3 };
    if (k in map) { e.preventDefault(); move(map[k]); }
  });

  // touch swipe
  let tx = 0, ty = 0;
  canvas.addEventListener('touchstart', e => {
    const t = e.touches[0]; tx = t.clientX; ty = t.clientY;
  }, { passive: true });
  // stop the page scrolling while swiping on the board
  canvas.addEventListener('touchmove', e => { e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchend', e => {
    const t = e.changedTouches[0];
    const dx = t.clientX - tx, dy = t.clientY - ty;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 0) : (dy > 0 ? 3 : 1));
    e.preventDefault();
  }, { passive: false });

  startBtn.addEventListener('click', newGame);
  restartBtn.addEventListener('click', newGame);
  newGame();
});
