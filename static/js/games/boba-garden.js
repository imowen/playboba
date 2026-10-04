/* Boba Garden - a cozy idle farming game. An original PlayBoba game.
 *
 * Same GENRE as viral garden idle games (plant, grow in real time, harvest,
 * sell, expand), but every asset here - pixel art, numbers, text, code - is
 * original and boba-milk-tea themed. Single-player, free, no account.
 *
 * Loop: tap an empty plot to plant the selected seed -> crops grow in real
 * time through 3 stages -> tap a glowing mature crop to harvest for coins ->
 * spend coins on more seeds or bigger fields. Crops keep growing while
 * you're away; anything that ripened is auto-sold when you return.
 *
 * Depends on: boba-garden-core.js (loaded first).
 */
(function () {
'use strict';

var Core = window.BobaGardenCore;
if (!Core) return;

var container = document.getElementById('game-container');
var scoreEl = document.getElementById('game-score');
var startBtn = document.getElementById('game-start-btn');
if (!container) return;

/* ---------------- crop art ---------------- */
var CROP_ART = [
  { emoji: '🍃', leaf: '#4d9e5f' },  // Tea Leaves
  { emoji: '🍠', leaf: '#9b7ede' },  // Taro
  { emoji: '⚪', leaf: '#f5f0e6' }   // Boba Pearls
];

/* ---------------- styles (self-contained) ---------------- */
var CSS = [
'.bg-wrap{position:relative;max-width:560px;margin:0 auto;touch-action:manipulation;-webkit-user-select:none;user-select:none;}',
'.bg-canvas{display:block;margin:0 auto;border-radius:14px;background:#a9744f;box-shadow:0 2px 10px rgba(90,60,20,.18);cursor:pointer;}',
'.bg-label{margin:10px 2px 6px;font-size:13px;color:#8a6f4d;}',
'.bg-seeds{display:flex;gap:8px;padding:4px 2px 6px;}',
'.bg-seed{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;border:2px solid #d8c49a;background:#fff8ea;border-radius:12px;padding:8px 4px;font-size:13px;cursor:pointer;font-family:inherit;color:#5a3d1e;}',
'.bg-seed .e{font-size:22px;}',
'.bg-seed .n{font-weight:700;}',
'.bg-seed .c{color:#9a7c52;font-size:12px;}',
'.bg-seed .p{color:#4d9e5f;font-size:11px;font-weight:700;}',
'.bg-seed.sel{border-color:#d9a441;box-shadow:0 0 0 3px rgba(255,196,80,.55);background:#fff3d9;}',
'.bg-seed.poor{opacity:.55;}',
'.bg-row{display:flex;gap:8px;padding:2px 2px 10px;}',
'.bg-expand{flex:1;border:0;border-radius:12px;padding:11px;font-size:14px;font-weight:700;cursor:pointer;background:#d9a441;color:#fff;font-family:inherit;}',
'.bg-expand:disabled{background:#d8cbb2;cursor:default;}',
'.bg-expand.maxed{background:#e8dcc4;color:#8a6f4d;}',
'.bg-toast{position:absolute;top:10px;left:50%;transform:translateX(-50%);background:rgba(60,40,15,.9);color:#fff8ea;font-size:13px;line-height:1.4;padding:8px 14px;border-radius:20px;z-index:6;pointer-events:none;opacity:0;transition:opacity .25s;max-width:92%;text-align:center;}',
'.bg-toast.show{opacity:1;}',
'.bg-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(60,40,15,.55);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);border-radius:14px;z-index:5;}',
'.bg-overlay.hidden{display:none;}',
'.bg-card{background:#fffaf0;border-radius:16px;padding:22px 24px;max-width:430px;width:92%;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.25);}',
'.bg-card h2{margin:0 0 6px;font-size:22px;color:#5a3d1e;}',
'.bg-card p{margin:8px 0;color:#7a5c38;font-size:14px;line-height:1.55;}',
'.bg-card .big{font-size:26px;font-weight:800;color:#4d9e5f;}',
'.bg-btn{display:inline-block;margin:10px 4px 0;border:0;border-radius:10px;padding:10px 20px;font-size:15px;font-weight:700;cursor:pointer;background:#d9a441;color:#fff;font-family:inherit;}'
].join('\n');
var styleEl = document.createElement('style');
styleEl.textContent = CSS;
document.head.appendChild(styleEl);

container.innerHTML =
  '<div class="bg-wrap">' +
    '<canvas class="bg-canvas"></canvas>' +
    '<div class="bg-toast"></div>' +
    '<div class="bg-label">🌱 Seeds — tap to select, then tap a plot to plant</div>' +
    '<div class="bg-seeds"></div>' +
    '<div class="bg-row"><button class="bg-expand"></button></div>' +
    '<div class="bg-overlay hidden"><div class="bg-card"></div></div>' +
  '</div>';

var wrap = container.querySelector('.bg-wrap');
var canvas = container.querySelector('.bg-canvas');
var ctx = canvas.getContext('2d');
var seedsEl = container.querySelector('.bg-seeds');
var expandBtn = container.querySelector('.bg-expand');
var toastEl = container.querySelector('.bg-toast');
var overlayEl = container.querySelector('.bg-overlay');
var cardEl = container.querySelector('.bg-card');

/* ---------------- helpers ---------------- */
function fmt(n) { return Math.floor(n).toLocaleString('en-US'); }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
var toastTimer = null;
function toast(msg, ms) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 2600);
}

/* ---------------- save / load ---------------- */
var SAVE_KEY = 'playboba_bobagarden_v1';
function save() {
  try {
    state.lastSeen = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {}
}
function load() {
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    var s = JSON.parse(raw);
    if (!s || s.v !== 1 || !s.plots || !s.stats) return null;
    return s;
  } catch (e) { return null; }
}

/* ---------------- game state ---------------- */
var state = null;
var floaters = [], poofs = [];
var cell = 64, ox = 0, oy = 12, cssW = 0, cssH = 0, gap = 8;

function layout() {
  var wrapW = wrap.clientWidth || 320;
  cssW = Math.min(wrapW, 520);
  var field = cssW - 16;
  cell = Math.floor((field - gap * (state.size - 1)) / state.size);
  var bw = cell * state.size + gap * (state.size - 1);
  ox = Math.floor((cssW - bw) / 2);
  oy = 12;
  cssH = oy * 2 + cell * state.size + gap * (state.size - 1);
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function plotXY(i) {
  var r = Math.floor(i / state.size), c = i % state.size;
  return { x: ox + c * (cell + gap), y: oy + r * (cell + gap) };
}

function plotAt(px, py) {
  var rect = canvas.getBoundingClientRect();
  var x = px - rect.left, y = py - rect.top;
  for (var i = 0; i < Core.plotCount(state); i++) {
    var p = plotXY(i);
    if (x >= p.x && x <= p.x + cell && y >= p.y && y <= p.y + cell) return i;
  }
  return -1;
}

/* ---------------- HUD / shop ---------------- */
function updateHud() {
  if (scoreEl) scoreEl.textContent = '🪙 ' + fmt(state.coins);
  renderSeeds();
  renderExpand();
}

function renderSeeds() {
  seedsEl.innerHTML = '';
  Core.CROPS.forEach(function (c, i) {
    var b = document.createElement('button');
    var afford = state.coins >= c.seed;
    b.className = 'bg-seed' + (state.selected === i ? ' sel' : '') + (afford ? '' : ' poor');
    b.innerHTML = '<span class="e">' + CROP_ART[i].emoji + '</span>' +
      '<span class="n">' + esc(c.name) + '</span>' +
      '<span class="c">🪙 ' + c.seed + ' · ⏱ ' + Math.round(c.growMs / 1000) + 's</span>' +
      '<span class="p">≈' + Core.profitPerMin(i).toFixed(0) + '/min</span>';
    (function (idx) {
      b.addEventListener('click', function () {
        state.selected = idx;
        save();
        renderSeeds();
      });
    })(i);
    seedsEl.appendChild(b);
  });
}

function renderExpand() {
  var cost = Core.expandCost(state);
  if (!cost) {
    expandBtn.textContent = '🌾 Max field size (5×5)';
    expandBtn.disabled = true;
    expandBtn.classList.add('maxed');
    return;
  }
  expandBtn.classList.remove('maxed');
  expandBtn.disabled = state.coins < cost;
  expandBtn.textContent = '🚜 Expand to ' + (state.size + 1) + '×' + (state.size + 1) +
    ' — 🪙' + fmt(cost);
}
expandBtn.addEventListener('click', function () {
  if (Core.expand(state)) {
    save(); layout(); updateHud();
    toast('🎉 Field expanded to ' + state.size + '×' + state.size + '!');
    for (var k = 0; k < 12; k++) poofs.push(newPoof(Math.random() * cssW, Math.random() * cssH));
  } else {
    toast('Not enough coins yet — harvest more! 🪙');
  }
});

/* ---------------- actions ---------------- */
function newPoof(x, y) {
  return { x: x, y: y, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 40, t0: performance.now(), life: 500 };
}

function onFieldTap(i) {
  if (i < 0) return;
  var now = Date.now();
  var plot = state.plots[i];
  var st = Core.stageOf(plot, now);
  if (st === 0) {
    var c = Core.CROPS[state.selected];
    if (Core.plant(state, i, state.selected, now)) {
      save(); updateHud();
      var p = plotXY(i);
      for (var k = 0; k < 8; k++) poofs.push(newPoof(p.x + cell / 2, p.y + cell / 2));
      if (state.stats.planted === 1) {
        setTimeout(function () { toast('Growing! ✨ Tap it again when it glows golden.'); }, 600);
      }
    } else {
      toast('Not enough coins for ' + c.name + ' seeds 🪙');
    }
  } else if (st === 3) {
    var gain = Core.harvest(state, i, now);
    if (gain > 0) {
      save(); updateHud();
      var q = plotXY(i);
      floaters.push({ x: q.x + cell / 2, y: q.y + 8, text: '+' + gain, t0: performance.now() });
    }
  } else {
    var pct = Math.round(Core.progressOf(plot, now) * 100);
    toast('⏳ ' + Core.CROPS[plot.crop].name + ' growing… ' + pct + '%');
  }
}

canvas.addEventListener('click', function (e) {
  onFieldTap(plotAt(e.clientX, e.clientY));
});

/* ---------------- overlays ---------------- */
function showWelcomeBack(rep) {
  var mins = Math.round(rep.awayMs / 60000);
  var away = mins >= 60 ? Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm' : mins + 'm';
  var html;
  if (rep.harvested > 0) {
    html = '<h2>🌙 Welcome back!</h2>' +
      '<p>While you were away (' + esc(away) + '), your crops kept growing.</p>' +
      '<p class="big">+🪙' + fmt(rep.earned) + '</p>' +
      '<p>' + rep.harvested + ' crop' + (rep.harvested > 1 ? 's' : '') +
      ' ripened and were auto-sold.</p>';
  } else if (rep.grew > 0) {
    html = '<h2>🌱 Welcome back!</h2>' +
      '<p>Your crops kept growing while you were away (' + esc(away) + '). ' +
      'Check the field — something may be ready to harvest!</p>';
  } else {
    html = '<h2>🧋 Boba Garden</h2>' +
      '<p>Plant seeds, harvest when golden, sell for coins, expand your field. ' +
      'Your garden keeps growing even while you\'re away!</p>';
  }
  html += '<button class="bg-btn" id="bg-ok">Let\'s farm! 🌱</button>';
  cardEl.innerHTML = html;
  overlayEl.classList.remove('hidden');
  document.getElementById('bg-ok').addEventListener('click', function () {
    overlayEl.classList.add('hidden');
  });
}

/* ---------------- drawing ---------------- */
function drawSoil(p) {
  ctx.fillStyle = '#8a5a38';
  rr(p.x, p.y, cell, cell, 10); ctx.fill();
  ctx.fillStyle = '#7a4e30';
  for (var r = 0; r < 3; r++) {
    var y = p.y + cell * (0.3 + r * 0.22);
    ctx.fillRect(p.x + 8, y, cell - 16, 3);
  }
}

function drawCrop(p, cropIdx, stage, now) {
  var cx = p.x + cell / 2, cy = p.y + cell / 2;
  var s = cell / 64; // art scale
  if (stage === 1) {
    ctx.fillStyle = '#5d3f28';
    ctx.beginPath(); ctx.arc(cx - 6 * s, cy + 4 * s, 2.6 * s, 0, 6.3); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 5 * s, cy + 6 * s, 2.6 * s, 0, 6.3); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 1 * s, cy - 3 * s, 2.6 * s, 0, 6.3); ctx.fill();
  } else if (stage === 2) {
    ctx.strokeStyle = '#3f7d44'; ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.moveTo(cx, cy + 10 * s); ctx.lineTo(cx, cy - 4 * s); ctx.stroke();
    ctx.fillStyle = '#57a05e';
    ctx.beginPath(); ctx.ellipse(cx - 7 * s, cy - 2 * s, 7 * s, 4 * s, -0.5, 0, 6.3); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 7 * s, cy - 6 * s, 7 * s, 4 * s, 0.5, 0, 6.3); ctx.fill();
  } else if (stage === 3) {
    if (cropIdx === 0) { // tea bush
      ctx.fillStyle = '#3f7d44';
      ctx.beginPath(); ctx.arc(cx - 9 * s, cy + 4 * s, 10 * s, 0, 6.3); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 9 * s, cy + 4 * s, 10 * s, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#57a05e';
      ctx.beginPath(); ctx.arc(cx, cy - 4 * s, 11 * s, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#6fbf73';
      ctx.beginPath(); ctx.arc(cx - 4 * s, cy - 8 * s, 4 * s, 0, 6.3); ctx.fill();
    } else if (cropIdx === 1) { // taro
      ctx.fillStyle = '#7c5cd6';
      rr(cx - 12 * s, cy - 8 * s, 24 * s, 18 * s, 8 * s); ctx.fill();
      ctx.fillStyle = '#9b7ede';
      rr(cx - 8 * s, cy - 5 * s, 12 * s, 8 * s, 4 * s); ctx.fill();
      ctx.strokeStyle = '#3f7d44'; ctx.lineWidth = 3 * s;
      ctx.beginPath(); ctx.moveTo(cx, cy - 8 * s); ctx.lineTo(cx, cy - 16 * s); ctx.stroke();
      ctx.fillStyle = '#57a05e';
      ctx.beginPath(); ctx.ellipse(cx, cy - 18 * s, 7 * s, 4 * s, 0, 0, 6.3); ctx.fill();
    } else { // boba pearls
      ctx.fillStyle = 'rgba(245,240,230,.95)';
      ctx.beginPath(); ctx.arc(cx - 8 * s, cy + 3 * s, 8 * s, 0, 6.3); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 8 * s, cy + 3 * s, 8 * s, 0, 6.3); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy - 6 * s, 8 * s, 0, 6.3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath(); ctx.arc(cx - 10 * s, cy + 1 * s, 2.4 * s, 0, 6.3); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 6 * s, cy + 1 * s, 2.4 * s, 0, 6.3); ctx.fill();
      ctx.beginPath(); ctx.arc(cx - 2 * s, cy - 8 * s, 2.4 * s, 0, 6.3); ctx.fill();
    }
  }
}

function draw(now) {
  ctx.clearRect(0, 0, cssW, cssH);
  if (!state) return;
  var n = Core.plotCount(state);
  for (var i = 0; i < n; i++) {
    var p = plotXY(i);
    drawSoil(p);
    var plot = state.plots[i];
    var st = Core.stageOf(plot, now);
    if (st > 0) {
      drawCrop(p, plot.crop, st, now);
      if (st === 3) {
        // golden "ready" glow, gently pulsing
        var pulse = 0.55 + 0.25 * Math.sin(now / 350);
        ctx.strokeStyle = 'rgba(255,205,90,' + pulse.toFixed(2) + ')';
        ctx.lineWidth = 4;
        rr(p.x + 2, p.y + 2, cell - 4, cell - 4, 9); ctx.stroke();
      } else {
        // progress bar
        var pr = Core.progressOf(plot, now);
        ctx.fillStyle = 'rgba(0,0,0,.28)';
        rr(p.x + 8, p.y + cell - 12, cell - 16, 5, 2.5); ctx.fill();
        ctx.fillStyle = '#8fd694';
        if (pr > 0) { rr(p.x + 8, p.y + cell - 12, (cell - 16) * pr, 5, 2.5); ctx.fill(); }
      }
    }
  }
  // coin floaters
  floaters = floaters.filter(function (f) { return now - f.t0 < 1100; });
  ctx.textAlign = 'center'; ctx.font = 'bold 17px sans-serif';
  floaters.forEach(function (f) {
    var q = (now - f.t0) / 1100;
    ctx.globalAlpha = 1 - q;
    ctx.fillStyle = '#2e7d32';
    ctx.fillText(f.text, f.x, f.y - q * 34);
    ctx.globalAlpha = 1;
  });
  // planting poofs
  poofs = poofs.filter(function (p2) { return now - p2.t0 < p2.life; });
  poofs.forEach(function (p2) {
    var q2 = (now - p2.t0) / p2.life;
    var dt = (now - p2.t0) / 1000;
    ctx.globalAlpha = 1 - q2;
    ctx.fillStyle = '#6b4e2a';
    ctx.fillRect(p2.x + p2.vx * dt - 2, p2.y + p2.vy * dt - 2, 4, 4);
    ctx.globalAlpha = 1;
  });
}

function loop(now) {
  requestAnimationFrame(loop);
  draw(now || performance.now());
}

/* ---------------- boot ---------------- */
function boot() {
  var now = Date.now();
  state = load();
  var fresh = !state;
  if (fresh) state = Core.newGame(now);
  layout();
  updateHud();
  // Offline settlement BEFORE first paint, then welcome-back modal.
  var rep = Core.settleOffline(state, now);
  save();
  loop();
  setInterval(save, 5000);
  window.addEventListener('resize', function () { layout(); });
  if (fresh) {
    setTimeout(function () {
      toast('👆 Tap any plot to plant ' + Core.CROPS[0].name + ' (🪙' + Core.CROPS[0].seed + ')!');
    }, 700);
  } else if (rep.awayMs > 60 * 1000) {
    setTimeout(function () { showWelcomeBack(rep); }, 400);
  }
  if (startBtn) {
    startBtn.textContent = '🔄 New Garden';
    startBtn.addEventListener('click', function () {
      if (window.confirm('Start over? Your current garden will be erased.')) {
        try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
        state = Core.newGame(Date.now());
        floaters = []; poofs = [];
        layout(); updateHud(); save();
        toast('🌱 Fresh garden! Tap a plot to plant.');
      }
    });
  }
}

boot();
})();
