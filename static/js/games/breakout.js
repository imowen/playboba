/* PlayBoba Breakout — original implementation.
 * Bounce the ball with the paddle, smash all bricks. 3 lives, endless levels.
 * Controls: arrows/mouse on desktop, drag on touch. Space/click/tap to launch. */
document.addEventListener('DOMContentLoaded', () => {
  const W = 480, H = 600;
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

  const PADDLE_W = 90, PADDLE_H = 14, PADDLE_Y = H - 40;
  const BALL_R = 8, ROWS = 5, COLS = 8;
  const COLORS = ['#f4a7c3', '#f4a7c3', '#c68b4e', '#c68b4e', '#7ed957'];

  let paddleX, ball, bricks, score, lives, level, playing, launched, raf;

  function buildBricks() {
    bricks = [];
    const bw = (W - 40) / COLS;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++)
      bricks.push({ x: 20 + c * bw, y: 60 + r * 26, w: bw - 6, h: 20,
                    color: COLORS[r % COLORS.length], alive: true, points: (ROWS - r) * 10 });
  }

  function resetBall() {
    ball = { x: paddleX + PADDLE_W / 2, y: PADDLE_Y - BALL_R - 2, dx: 0, dy: 0 };
    launched = false;
  }

  function newGame() {
    paddleX = W / 2 - PADDLE_W / 2;
    score = 0; lives = 3; level = 1; playing = true;
    overEl.classList.add('hidden');
    buildBricks(); resetBall(); updateHud();
    startBtn.textContent = '⏸ Pause';
    cancelAnimationFrame(raf); loop();
  }

  function updateHud() {
    scoreEl.textContent = 'Score: ' + score + '   Lives: ' + lives + '   Level: ' + level;
  }

  function launch() {
    if (!launched && playing) {
      const speed = 5 + level * 0.7;
      const ang = -Math.PI / 2 + (Math.random() * 0.6 - 0.3);
      ball.dx = speed * Math.cos(ang); ball.dy = speed * Math.sin(ang);
      launched = true;
    }
  }

  function loop() {
    if (!playing) return;
    if (launched) step();
    draw();
    raf = requestAnimationFrame(loop);
  }

  function step() {
    ball.x += ball.dx; ball.y += ball.dy;
    if (ball.x < BALL_R || ball.x > W - BALL_R) ball.dx *= -1;
    if (ball.y < BALL_R) ball.dy *= -1;
    // paddle
    if (ball.dy > 0 && ball.y + BALL_R >= PADDLE_Y && ball.y + BALL_R <= PADDLE_Y + PADDLE_H + 8 &&
        ball.x >= paddleX && ball.x <= paddleX + PADDLE_W) {
      const rel = (ball.x - paddleX) / PADDLE_W - 0.5; // -0.5..0.5
      const speed = Math.hypot(ball.dx, ball.dy);
      const ang = -Math.PI / 2 + rel * 1.4; // max ~80° off vertical
      ball.dx = speed * Math.cos(ang); ball.dy = speed * Math.sin(ang);
      ball.y = PADDLE_Y - BALL_R - 1;
    }
    // bricks
    for (const b of bricks) {
      if (!b.alive) continue;
      if (ball.x + BALL_R > b.x && ball.x - BALL_R < b.x + b.w &&
          ball.y + BALL_R > b.y && ball.y - BALL_R < b.y + b.h) {
        b.alive = false; score += b.points; ball.dy *= -1; updateHud();
        break;
      }
    }
    // missed
    if (ball.y - BALL_R > H) {
      lives--; updateHud();
      if (lives <= 0) return endGame();
      resetBall();
    }
    // level cleared
    if (bricks.every(b => !b.alive)) {
      level++; buildBricks(); resetBall(); updateHud();
    }
  }

  function endGame() {
    playing = false; cancelAnimationFrame(raf);
    finalEl.textContent = score + ' (Level ' + level + ')';
    overEl.classList.remove('hidden');
    startBtn.textContent = '▶ Start';
  }

  function draw() {
    ctx.fillStyle = '#241a10'; ctx.fillRect(0, 0, W, H);
    for (const b of bricks) {
      if (!b.alive) continue;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
    ctx.fillStyle = '#f4a7c3'; // paddle (strawberry pink)
    ctx.fillRect(paddleX, PADDLE_Y, PADDLE_W, PADDLE_H);
    ctx.fillStyle = '#fff8ef'; // ball (milk white)
    ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_R, 0, 7); ctx.fill();
    if (!launched && playing) {
      ctx.fillStyle = '#fff8ef'; ctx.font = '15px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Press SPACE or tap to launch', W / 2, H / 2);
    }
  }

  function movePaddleTo(clientX) {
    const r = canvas.getBoundingClientRect();
    const scale = canvas.width / r.width;
    paddleX = Math.min(W - PADDLE_W, Math.max(0, (clientX - r.left) * scale - PADDLE_W / 2));
    if (!launched) { ball.x = paddleX + PADDLE_W / 2; ball.y = PADDLE_Y - BALL_R - 2; }
  }

  document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') { paddleX = Math.max(0, paddleX - 24); e.preventDefault(); }
    if (k === 'arrowright' || k === 'd') { paddleX = Math.min(W - PADDLE_W, paddleX + 24); e.preventDefault(); }
    if (k === ' ') { e.preventDefault(); playing ? launch() : null; }
  });
  canvas.addEventListener('mousemove', e => movePaddleTo(e.clientX));
  canvas.addEventListener('click', () => launch());

  let dragging = false;
  canvas.addEventListener('touchstart', e => { dragging = true; movePaddleTo(e.touches[0].clientX); }, { passive: true });
  canvas.addEventListener('touchmove', e => { if (dragging) movePaddleTo(e.touches[0].clientX); e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchend', e => {
    dragging = false;
    if (!launched) launch(); // tap to launch
    e.preventDefault();
  }, { passive: false });

  startBtn.addEventListener('click', () => {
    if (playing) { playing = false; cancelAnimationFrame(raf); startBtn.textContent = '▶ Resume'; }
    else if (lives > 0 && bricks) { playing = true; startBtn.textContent = '⏸ Pause'; loop(); }
    else newGame();
  });
  restartBtn.addEventListener('click', newGame);

  // idle attract screen
  paddleX = W / 2 - PADDLE_W / 2; score = 0; lives = 3; level = 1;
  buildBricks(); resetBall(); updateHud(); draw();
});
