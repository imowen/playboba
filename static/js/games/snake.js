/* PlayBoba Snake — original implementation.
 * Eat pellets to grow; don't hit walls or your tail. Speed increases as you score.
 * Controls: arrow keys / WASD on desktop, swipe on touch devices. */
document.addEventListener('DOMContentLoaded', () => {
  const COLS = 20, ROWS = 20, CELL = 22, W = COLS * CELL, H = ROWS * CELL;
  const container = document.getElementById('game-container');
  const scoreEl = document.getElementById('game-score');
  const startBtn = document.getElementById('game-start-btn');
  const overEl = document.getElementById('game-over');
  const finalEl = document.getElementById('final-score');
  const restartBtn = document.getElementById('game-restart-btn');

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let snake, dir, nextDir, food, score, playing, timer;

  function newGame() {
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    dir = { x: 1, y: 0 }; nextDir = dir;
    score = 0; playing = true;
    overEl.classList.add('hidden');
    placeFood(); updateScore();
    startBtn.textContent = '⏸ Pause';
    clearInterval(timer);
    timer = setInterval(tick, speed());
  }

  function speed() { return Math.max(70, 150 - score * 2); } // faster as you score

  function placeFood() {
    while (true) {
      const f = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
      if (!snake.some(s => s.x === f.x && s.y === f.y)) { food = f; return; }
    }
  }

  function updateScore() { scoreEl.textContent = 'Score: ' + score; }

  function tick() {
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    // wall or self collision
    if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS ||
        snake.some(s => s.x === head.x && s.y === head.y)) {
      return endGame();
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10; updateScore(); placeFood();
      clearInterval(timer); timer = setInterval(tick, speed());
    } else {
      snake.pop();
    }
    draw();
  }

  function endGame() {
    playing = false; clearInterval(timer);
    snake = []; // so the Start button begins a fresh game, not a dead one
    finalEl.textContent = score;
    overEl.classList.remove('hidden');
    startBtn.textContent = '▶ Start';
  }

  function toggle() {
    if (playing) { // pause
      playing = false; clearInterval(timer);
      startBtn.textContent = '▶ Resume';
    } else if (snake && snake.length) { // resume (only if a game is in progress)
      playing = true;
      timer = setInterval(tick, speed());
      startBtn.textContent = '⏸ Pause';
    } else {
      newGame();
    }
  }

  function draw() {
    ctx.fillStyle = '#1d2b1d'; ctx.fillRect(0, 0, W, H);
    // food (boba pearl 🧋 style: pink circle)
    ctx.fillStyle = '#f4a7c3';
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 3, 0, 7);
    ctx.fill();
    // snake
    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? '#7ed957' : '#4caf50';
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
    });
  }

  function steer(x, y) {
    if (x === -dir.x && y === -dir.y) return; // no reversing
    nextDir = { x, y };
  }

  document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    const map = { arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0],
                  arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1] };
    if (k in map) { e.preventDefault(); steer(...map[k]); }
    if (k === ' ') { e.preventDefault(); toggle(); }
  });

  let tx = 0, ty = 0;
  canvas.addEventListener('touchstart', e => {
    const t = e.touches[0]; tx = t.clientX; ty = t.clientY;
  }, { passive: true });
  canvas.addEventListener('touchend', e => {
    const t = e.changedTouches[0];
    const dx = t.clientX - tx, dy = t.clientY - ty;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) { toggle(); return; }
    if (Math.abs(dx) > Math.abs(dy)) steer(dx > 0 ? 1 : -1, 0);
    else steer(0, dy > 0 ? 1 : -1);
    e.preventDefault();
  }, { passive: false });

  startBtn.addEventListener('click', toggle);
  restartBtn.addEventListener('click', newGame);
  // draw an idle board behind the start button
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  dir = nextDir = { x: 1, y: 0 }; food = { x: 14, y: 10 }; score = 0;
  updateScore(); draw();
});
