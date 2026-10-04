/* PlayBoba Memory Match — original implementation.
 * Flip cards to find all 8 pairs. Fewer moves + less time = higher score.
 * Controls: click / tap. No keyboard needed. */
document.addEventListener('DOMContentLoaded', () => {
  const SYMBOLS = ['🧋', '🍓', '🐱', '🚀', '🎵', '🌈', '🍕', '⚽'];
  const COLS = 4, ROWS = 4, N = COLS * ROWS;
  const container = document.getElementById('game-container');
  const scoreEl = document.getElementById('game-score');
  const startBtn = document.getElementById('game-start-btn');
  const overEl = document.getElementById('game-over');
  const finalEl = document.getElementById('final-score');
  const restartBtn = document.getElementById('game-restart-btn');

  const board = document.createElement('div');
  board.className = 'memory-board';
  container.appendChild(board);

  // board styles injected here so the game is self-contained
  const style = document.createElement('style');
  style.textContent = `
    .memory-board { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; width:100%; max-width:440px; }
    .mcard { aspect-ratio:1; border-radius:10px; font-size:2.2rem; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      background:#c68b4e; border:none; transition:transform .15s; }
    .mcard:hover { transform:scale(1.05); }
    .mcard.open, .mcard.done { background:#fff8ef; }
    .mcard.done { outline:3px solid #7ed957; cursor:default; }
    .memory-meta { color:#fff8ef; text-align:center; margin-top:10px; font-weight:600; }`;
  document.head.appendChild(style);
  const meta = document.createElement('div');
  meta.className = 'memory-meta';
  container.parentElement.appendChild(meta); // under the frame, readable on dark bg

  let deck, open, matched, moves, startTime, lock, timer, playing;

  function shuffled() {
    const d = [...SYMBOLS, ...SYMBOLS];
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  }

  function newGame() {
    deck = shuffled(); open = []; matched = 0; moves = 0;
    startTime = Date.now(); lock = false; playing = true;
    overEl.classList.add('hidden');
    board.innerHTML = '';
    deck.forEach((sym, i) => {
      const b = document.createElement('button');
      b.className = 'mcard'; b.dataset.i = i; b.dataset.sym = sym;
      b.setAttribute('aria-label', 'card ' + (i + 1));
      b.addEventListener('click', () => flip(b));
      board.appendChild(b);
    });
    updateHud();
    clearInterval(timer);
    timer = setInterval(updateHud, 500);
    startBtn.textContent = '↻ Restart';
  }

  function elapsed() { return Math.floor((Date.now() - startTime) / 1000); }

  function updateHud() {
    const s = elapsed(), mm = String(Math.floor(s / 60)).padStart(2, '0'), ss = String(s % 60).padStart(2, '0');
    scoreEl.textContent = 'Pairs: ' + matched + '/8   Moves: ' + moves;
    meta.textContent = '⏱ ' + mm + ':' + ss;
  }

  function flip(card) {
    if (!playing || lock || card.classList.contains('open') || card.classList.contains('done')) return;
    card.classList.add('open'); card.textContent = card.dataset.sym;
    open.push(card);
    if (open.length === 2) {
      moves++;
      if (open[0].dataset.sym === open[1].dataset.sym) {
        open.forEach(c => { c.classList.remove('open'); c.classList.add('done'); });
        matched++; open = []; updateHud();
        if (matched === 8) endGame();
      } else {
        lock = true;
        setTimeout(() => {
          open.forEach(c => { c.classList.remove('open'); c.textContent = ''; });
          open = []; lock = false; updateHud();
        }, 700);
      }
    }
    updateHud();
  }

  function endGame() {
    playing = false; clearInterval(timer);
    const timeBonus = Math.max(0, 300 - elapsed()) * 5;
    const moveBonus = Math.max(0, 40 - moves) * 20;
    const final = 1000 + timeBonus + moveBonus;
    scoreEl.textContent = 'Score: ' + final;
    finalEl.textContent = final + '  (' + moves + ' moves, ' + elapsed() + 's)';
    overEl.classList.remove('hidden');
    startBtn.textContent = '▶ Start';
  }

  startBtn.addEventListener('click', newGame);
  restartBtn.addEventListener('click', newGame);
  newGame();
});
