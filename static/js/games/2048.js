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
    if (!empties.length) return null;
    const [r, c] = empties[Math.floor(Math.random() * empties.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    return [r, c];
  }

  function newGame() {
    grid = emptyGrid(); score = 0; playing = true; won = false;
    anim = null; spawnPop = null;
    overEl.classList.add('hidden');
    randomTile(); randomTile();
    updateScore(); draw();
    startBtn.textContent = '↻ Restart';
  }

  function updateScore() { scoreEl.textContent = 'Score: ' + score; }

  // cell coordinates in "slide order" for a direction
  function cellAt(dir, i, j) { // 0=left 1=up 2=right 3=down
    if (dir === 0) return [i, j];
    if (dir === 2) return [i, SIZE - 1 - j];
    if (dir === 1) return [j, i];
    return [SIZE - 1 - j, i];
  }

  let anim = null; // {moves:[{fr,fc,tr,tc,v,merged}], start}

  function move(dir) {
    if (!playing || anim) return;
    const next = emptyGrid(), moves = [];
    let moved = false, gained = 0;
    for (let i = 0; i < SIZE; i++) {
      const vals = [];
      for (let j = 0; j < SIZE; j++) {
        const [r, c] = cellAt(dir, i, j);
        if (grid[r][c]) vals.push({ v: grid[r][c], r, c });
      }
      const out = [];
      for (let k = 0; k < vals.length; k++) {
        const [tr, tc] = cellAt(dir, i, out.length);
        if (k + 1 < vals.length && vals[k].v === vals[k + 1].v) {
          const nv = vals[k].v * 2;
          moves.push({ fr: vals[k].r, fc: vals[k].c, tr, tc, v: nv, merged: true });
          moves.push({ fr: vals[k + 1].r, fc: vals[k + 1].c, tr, tc, v: nv, merged: true });
          out.push(nv); gained += nv; k++;
        } else {
          moves.push({ fr: vals[k].r, fc: vals[k].c, tr, tc, v: vals[k].v, merged: false });
          out.push(vals[k].v);
        }
      }
      for (let j = 0; j < SIZE; j++) {
        const [r, c] = cellAt(dir, i, j);
        next[r][c] = j < out.length ? out[j] : 0;
      }
    }
    moved = moves.some(m => m.fr !== m.tr || m.fc !== m.tc);
    if (!moved) return;
    grid = next; score += gained;
    if (!won && grid.flat().some(v => v >= 2048)) won = true;
    updateScore();
    anim = { moves, start: performance.now() };
    requestAnimationFrame(drawAnim);
  }

  function drawAnim(now) {
    const t = Math.min(1, (now - anim.start) / 130);
    const e = 1 - (1 - t) * (1 - t); // easeOutQuad
    drawTiles(anim.moves, e);
    if (t < 1) { requestAnimationFrame(drawAnim); return; }
    anim = null;
    const spawned = randomTile();
    spawnPop = spawned ? { r: spawned[0], c: spawned[1], start: performance.now() } : null;
    drawPop();
    if (!canMove()) endGame();
  }

  // Short rAF loop so the spawn pop actually plays out instead of
  // freezing at its first (tiny) frame until the next move redraws.
  function drawPop() {
    draw();
    if (spawnPop && performance.now() - spawnPop.start < 160) {
      requestAnimationFrame(drawPop);
    } else {
      spawnPop = null;
      draw();
    }
  }

  let spawnPop = null;

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

  function tileColor(v) { return v ? (COLORS[v] || '#3c3a32') : 'rgba(238,228,218,.35)'; }

  function drawTileAt(pr, pc, v, scale) {
    const s = CELL * scale, off = (CELL - s) / 2;
    const x = GAP + pc * (CELL + GAP) + off, y = GAP + pr * (CELL + GAP) + off;
    ctx.fillStyle = tileColor(v);
    roundRect(x, y, s, s, 8); ctx.fill();
    if (v) {
      ctx.fillStyle = v <= 4 ? '#776e65' : '#f9f6f2';
      const fs = (v < 100 ? 44 : v < 1000 ? 38 : 30) * scale;
      ctx.font = 'bold ' + fs + 'px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(v, x + s / 2, y + s / 2 + 2);
    }
  }

  function drawBoard() {
    ctx.fillStyle = '#bbada0';
    ctx.fillRect(0, 0, BOARD, BOARD);
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++)
      drawTileAt(r, c, 0, 1);
  }

  function drawTiles(moves, e) {
    drawBoard();
    for (const m of moves) {
      const pr = m.fr + (m.tr - m.fr) * e, pc = m.fc + (m.tc - m.fc) * e;
      const scale = m.merged ? 1 + 0.18 * Math.sin(Math.PI * e) : 1;
      drawTileAt(pr, pc, m.v, scale);
    }
  }

  function draw() {
    drawBoard();
    const now = performance.now();
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      const v = grid[r][c];
      if (!v) continue;
      let scale = 1;
      if (spawnPop && spawnPop.r === r && spawnPop.c === c) {
        const t = Math.min(1, (now - spawnPop.start) / 160);
        scale = 0.4 + 0.6 * t;
      }
      drawTileAt(r, c, v, scale);
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
