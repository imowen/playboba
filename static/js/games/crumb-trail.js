/* Crumb Trail - ant color-sorting puzzle. An original PlayBoba game.
 *
 * Same GENRE as viral "ant moving" sorting games (ants carry colored blocks
 * from a pixel picture back to the nest), but every asset here - pixel art,
 * levels, text, code - is original. Boba milk tea themed, English-first.
 *
 * Rules: the tray holds an ordered queue of color boxes; tap any of the
 * glowing front boxes to release its ants into a nest slot (5 max).
 * Ants automatically nibble exposed blocks of their color (picture edge,
 * or touching cleared space), outside-in. A slot frees only when its color
 * is fully cleared - deploy buried colors early and the slot clogs.
 * Clear every block to win; 5 clogged slots (or an empty tray) with blocks
 * left means the colony stalls.
 *
 * Depends on: crumb-trail-levels.js, crumb-trail-core.js (loaded first).
 */
(function () {
'use strict';

var Core = window.CrumbTrailCore;
var LEVELS = window.CrumbTrailLevels;
if (!Core || !LEVELS) return;

var container = document.getElementById('game-container');
var scoreEl = document.getElementById('game-score');
var startBtn = document.getElementById('game-start-btn');
if (!container) return;

/* ---------------- styles (self-contained) ---------------- */
var CSS = [
'.ct-wrap{position:relative;max-width:560px;margin:0 auto;touch-action:manipulation;-webkit-user-select:none;user-select:none;}',
'.ct-canvas{display:block;margin:0 auto;border-radius:14px;background:#e7d9b8;box-shadow:0 2px 10px rgba(90,60,20,.15);}',
'.ct-tray-label{margin:10px 2px 6px;font-size:13px;color:#8a6f4d;}',
'.ct-tray{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 10px;}',
'.ct-box{flex:0 0 auto;display:flex;align-items:center;gap:7px;border:2px solid #d8c49a;background:#fff8ea;border-radius:10px;padding:8px 11px;font-size:14px;cursor:pointer;transition:transform .12s,box-shadow .12s,opacity .2s;font-family:inherit;}',
'.ct-box .sw{width:18px;height:18px;border-radius:5px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.18);}',
'.ct-box.on{box-shadow:0 0 0 3px rgba(255,196,80,.6);}',
'.ct-box.on:active{transform:scale(.93);}',
'.ct-box.off{opacity:.32;cursor:default;}',
'.ct-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(60,40,15,.55);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);border-radius:14px;z-index:5;}',
'.ct-overlay.hidden{display:none;}',
'.ct-card{background:#fffaf0;border-radius:16px;padding:22px 24px;max-width:430px;width:92%;max-height:92%;overflow-y:auto;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.25);}',
'.ct-card h2{margin:0 0 4px;font-size:22px;color:#5a3d1e;}',
'.ct-card p{margin:8px 0;color:#7a5c38;font-size:14px;line-height:1.55;}',
'.ct-levels{display:flex;flex-direction:column;gap:8px;margin:12px 0 4px;}',
'.ct-level{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:2px solid #e6d3a8;background:#fff;border-radius:12px;padding:10px 12px;cursor:pointer;font-size:15px;font-family:inherit;}',
'.ct-level:hover{border-color:#d9a441;}',
'.ct-level .t{font-weight:700;color:#5a3d1e;}',
'.ct-level .s{font-size:12px;color:#9a7c52;}',
'.ct-level .done{margin-left:auto;color:#4d9e5f;font-weight:700;font-size:18px;}',
'.ct-btn{display:inline-block;margin:8px 4px 0;border:0;border-radius:10px;padding:10px 18px;font-size:15px;font-weight:700;cursor:pointer;background:#d9a441;color:#fff;font-family:inherit;}',
'.ct-btn.ghost{background:#e8dcc4;color:#6b4e2a;}',
'.ct-stats{display:flex;justify-content:center;gap:20px;margin:10px 0;font-size:14px;color:#7a5c38;}',
'.ct-stats b{color:#5a3d1e;}',
'.ct-shake{animation:ctshake .3s;}',
'.ct-toast{position:absolute;top:10px;left:50%;transform:translateX(-50%);background:rgba(60,40,15,.9);color:#fff8ea;font-size:13px;line-height:1.4;padding:8px 14px;border-radius:20px;z-index:6;pointer-events:none;opacity:0;transition:opacity .25s;max-width:92%;text-align:center;}',
'.ct-toast.show{opacity:1;}',
'@keyframes ctshake{0%,100%{transform:translateX(0);}25%{transform:translateX(-5px);}75%{transform:translateX(5px);}}'
].join('\n');
var styleEl = document.createElement('style');
styleEl.textContent = CSS;
document.head.appendChild(styleEl);

container.innerHTML =
  '<div class="ct-wrap">' +
    '<canvas class="ct-canvas"></canvas>' +
    '<div class="ct-tray-label">🧺 Tray — tap a <b>glowing</b> box to release its ants</div>' +
    '<div class="ct-tray"></div>' +
    '<div class="ct-toast"></div>' +
    '<div class="ct-overlay"><div class="ct-card"></div></div>' +
  '</div>';

var wrap = container.querySelector('.ct-wrap');
var canvas = container.querySelector('.ct-canvas');
var ctx = canvas.getContext('2d');
var trayEl = container.querySelector('.ct-tray');
var toastEl = container.querySelector('.ct-toast');
var toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2800);
}
var overlayEl = container.querySelector('.ct-overlay');
var cardEl = container.querySelector('.ct-card');

/* ---------------- helpers ---------------- */
function hexA(hex, a) {
  var r = parseInt(hex.slice(1, 3), 16),
      g = parseInt(hex.slice(3, 5), 16),
      b = parseInt(hex.slice(5, 7), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}
function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function loadDone() {
  try { return JSON.parse(localStorage.getItem('playboba_crumbtrail_done') || '[]'); }
  catch (e) { return []; }
}
function saveDone(id) {
  var d = loadDone();
  if (d.indexOf(id) < 0) {
    d.push(id);
    try { localStorage.setItem('playboba_crumbtrail_done', JSON.stringify(d)); } catch (e) {}
  }
}

/* ---------------- game state ---------------- */
var parsedCache = {};
function getParsed(level) {
  if (!parsedCache[level.id]) parsedCache[level.id] = Core.parseLevel(level);
  return parsedCache[level.id];
}

var levelIdx = 0, level = null, parsed = null, sim = null;
var playing = false, overlayOpen = false;
var bites = 0, ticks = 0;
var timer = null;
var trips = [], particles = [], flashes = [];
var exposedCache = null, deployedColors = null, slotIdle = [];
var cell = 32, bw = 0, bh = 0, cssW = 0, cssH = 0, ox = 0;
var nestY = 0, nestH = 92;
var slotGeom = [];

/* Ant crawl pacing: constant crawl SPEED (px/s) like real ants — longer trips
 * take longer. Small stepping bob + weave so it reads as crawling, and ants
 * emerge from / burrow into a nest hole instead of popping in and out. */
var ANT_SPEED = 78;      // px per second, laden slightly slower
var TRIP_BITE = 420;     // ms: nibble pause on the cell

/* ---------------- layout ---------------- */
function layout() {
  var wrapW = wrap.clientWidth || 320;
  cell = Math.max(20, Math.min(40, Math.floor(Math.min(wrapW, 520) / parsed.W)));
  bw = cell * parsed.W;
  bh = cell * parsed.H;
  cssW = Math.min(wrapW, 520);
  ox = Math.floor((cssW - bw) / 2);
  nestY = bh + 12;
  cssH = nestY + nestH;
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  slotGeom = [];
  for (var i = 0; i < Core.MAX_SLOTS; i++) {
    slotGeom.push({ cx: cssW * (i + 0.5) / Core.MAX_SLOTS, cy: nestY + 34 });
  }
}

function cellCenter(i) {
  var c = parsed.cells[i];
  return { x: ox + c.x * cell + cell / 2, y: c.y * cell + cell / 2 };
}

/* ---------------- per-tick derived info ---------------- */
function refreshDerived() {
  exposedCache = {};
  var i;
  for (i = 0; i < parsed.cells.length; i++) {
    if (Core.isExposed(parsed, sim.hp, i)) exposedCache[i] = 1;
  }
  deployedColors = {};
  slotIdle = sim.slots.map(function (s) {
    deployedColors[s.color] = 1;
    return Core.firstExposedOfColor(parsed, sim.hp, s.color) < 0;
  });
}

/* ---------------- tray (DOM) ---------------- */
function renderTray() {
  trayEl.innerHTML = '';
  if (!sim.tray.length) {
    var d = document.createElement('div');
    d.className = 'ct-tray-label';
    d.textContent = 'Tray empty — the colony is on its own now. 🐜';
    trayEl.appendChild(d);
    return;
  }
  sim.tray.forEach(function (b, i) {
    var btn = document.createElement('button');
    btn.className = 'ct-box ' + (i < Core.REACHABLE ? 'on' : 'off');
    btn.innerHTML = '<span class="sw" style="background:' + b.color + '"></span>' +
      '<span>🐜×' + b.ants + '</span>';
    if (i < Core.REACHABLE) {
      (function (idx) {
        btn.addEventListener('click', function () { onTrayClick(idx); });
      })(i);
    }
    trayEl.appendChild(btn);
  });
}

function onTrayClick(idx) {
  if (!playing || overlayOpen || idx >= Core.REACHABLE) return;
  var boxColor = sim.tray[idx] && sim.tray[idx].color;
  var ns = Core.deploy(sim, idx);
  if (!ns) { // nest full
    wrap.classList.remove('ct-shake');
    void wrap.offsetWidth;
    wrap.classList.add('ct-shake');
    return;
  }
  sim = ns;
  refreshDerived();
  renderTray();
  updateHud();
  // If the deployed color has nothing exposed yet, say so plainly instead of
  // leaving the player staring at idle ants.
  if (boxColor && Core.firstExposedOfColor(parsed, sim.hp, boxColor) < 0) {
    toast('💤 No exposed blocks of this color yet — nibble the outer edge first!');
  }
}

/* ---------------- overlays ---------------- */
function showOverlay(html) {
  cardEl.innerHTML = html;
  overlayEl.classList.remove('hidden');
  overlayOpen = true;
}
function hideOverlay() {
  overlayEl.classList.add('hidden');
  overlayOpen = false;
}
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

function showLevelSelect() {
  playing = false;
  if (timer) { clearInterval(timer); timer = null; }
  var done = loadDone();
  var html = '<h2>🐜 Crumb Trail</h2>' +
    '<p>Release your ants, nibble the pixel treats <b>outside-in</b>, and don\'t clog the nest! ' +
    'Tap a glowing tray box to deploy it. A slot frees only when its color is fully cleared.</p>' +
    '<div class="ct-levels">';
  LEVELS.forEach(function (lv, i) {
    var ok = done.indexOf(lv.id) >= 0;
    html += '<button class="ct-level" data-i="' + i + '"><span style="font-size:24px">🍮</span>' +
      '<span><span class="t">' + (i + 1) + '. ' + esc(lv.name) + '</span><br>' +
      '<span class="s">' + esc(lv.sub) + '</span></span>' +
      (ok ? '<span class="done">✓</span>' : '') + '</button>';
  });
  html += '</div>';
  showOverlay(html);
  var btns = cardEl.querySelectorAll('.ct-level');
  Array.prototype.forEach.call(btns, function (b) {
    b.addEventListener('click', function () {
      startLevel(parseInt(b.getAttribute('data-i'), 10));
    });
  });
}

function wireEndButtons(hasNext) {
  var again = document.getElementById('ct-again');
  if (again) again.addEventListener('click', function () { startLevel(levelIdx); });
  var next = document.getElementById('ct-next');
  if (next && hasNext) next.addEventListener('click', function () { startLevel(levelIdx + 1); });
  var lv = document.getElementById('ct-levels');
  if (lv) lv.addEventListener('click', showLevelSelect);
}

function onWin() {
  playing = false;
  if (timer) { clearInterval(timer); timer = null; }
  saveDone(level.id);
  setTimeout(function () {
    var hasNext = levelIdx + 1 < LEVELS.length;
    showOverlay(
      '<h2>🎉 Level Clear!</h2>' +
      '<p>Every last crumb of <b>' + esc(level.name) + '</b> is home. The colony feasts tonight! 🧋</p>' +
      '<div class="ct-stats"><span>Bites <b>' + bites + '</b></span><span>Ticks <b>' + ticks + '</b></span></div>' +
      '<button class="ct-btn" id="ct-again">🔄 Replay</button>' +
      (hasNext ? '<button class="ct-btn" id="ct-next">Next level ▶</button>' : '') +
      '<button class="ct-btn ghost" id="ct-levels">🍃 Levels</button>'
    );
    wireEndButtons(hasNext);
  }, 900);
}

function onFail() {
  playing = false;
  if (timer) { clearInterval(timer); timer = null; }
  setTimeout(function () {
    showOverlay(
      '<h2>🐜💤 Nest clogged!</h2>' +
      '<p>All 5 slots are stuck with buried colors and nothing can be reached. ' +
      'Tip: deploy the <b>outer</b> colors first — ants can only bite the picture\'s edge.</p>' +
      '<button class="ct-btn" id="ct-again">🔄 Try again</button>' +
      '<button class="ct-btn ghost" id="ct-levels">🍃 Levels</button>'
    );
    wireEndButtons(false);
  }, 900);
}

/* ---------------- flow ---------------- */
function startLevel(i) {
  levelIdx = i;
  level = LEVELS[i];
  parsed = getParsed(level);
  sim = Core.initialState(parsed, level);
  bites = 0; ticks = 0;
  trips = []; particles = []; flashes = [];
  hideOverlay();
  layout();
  renderTray();
  refreshDerived();
  updateHud();
  playing = true;
  if (timer) clearInterval(timer);
  timer = setInterval(tick, Core.TICK_MS);
}

function updateHud() {
  if (scoreEl) scoreEl.textContent = '🐜 ' + level.name + ' · ' + bites + ' bites';
}

function tick() {
  if (!playing) return;
  var preColors = sim.slots.map(function (s) { return s.color; });
  var r = Core.eatTick(parsed, sim);
  sim = r.state;
  ticks++;
  bites += r.bites.length;
  var now = performance.now();
  // One visible ant per slot per tick (the sim may bite several times, but a
  // steady single-file trail reads as "ants crawling", not teleporting).
  var seenColor = {};
  r.bites.forEach(function (b) {
    if (seenColor[b.color]) return;
    seenColor[b.color] = 1;
    var si = preColors.indexOf(b.color);
    if (si >= 0 && slotGeom[si]) spawnTrip(si, b, now);
  });
  refreshDerived();
  updateHud();
  if (Core.isWin(parsed, sim)) { onWin(); return; }
  if (r.bites.length === 0 && Core.isDead(parsed, sim)) onFail();
}

/* ---------------- animation ---------------- */
function spawnTrip(si, bite, now) {
  var g = slotGeom[si], c = cellCenter(bite.cell);
  var hx = g.cx, hy = g.cy - 12; // nest hole mouth
  var ddx = c.x - hx, ddy = c.y - hy;
  var dist = Math.sqrt(ddx * ddx + ddy * ddy);
  // Constant crawl speed like a real ant: longer trips take longer.
  var outDur = Math.max(800, dist / ANT_SPEED * 1000);
  var backDur = Math.max(800, dist / (ANT_SPEED * 0.92) * 1000);
  var total = outDur + TRIP_BITE + backDur;
  // Perpendicular wobble so the crawl weaves instead of lasering straight.
  var len = dist || 1;
  trips.push({
    x0: hx, y0: hy, x1: c.x, y1: c.y,
    nx: -ddy / len, ny: ddx / len,
    wob: 5 + Math.random() * 7,
    t0: now, outDur: outDur, backDur: backDur, total: total, color: bite.color
  });
  // Bite flash + crumb particles fire when the ant ARRIVES, not at spawn.
  var arrive = now + outDur;
  flashes.push({ x: c.x, y: c.y, t0: arrive });
  if (bite.cleared) {
    for (var k = 0; k < 6; k++) {
      var a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 70;
      particles.push({
        x: c.x, y: c.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 25,
        t0: arrive + 100, life: 450, color: bite.color
      });
    }
  }
}

function easeCrawl(q) {
  return q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
}

function drawAnt(x, y, color, carrying, scale, alpha) {
  scale = scale || 1;
  alpha = (alpha === undefined) ? 1 : alpha;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#2e2a26';
  ctx.beginPath(); ctx.ellipse(0, 0, 5.2, 3.6, 0, 0, 6.3); ctx.fill();
  ctx.beginPath(); ctx.arc(4.7, -1.2, 2.3, 0, 6.3); ctx.fill();
  if (carrying) {
    ctx.fillStyle = color;
    ctx.fillRect(-8, -11.5, 7, 7); // the grabbed chunk, held overhead
  }
  ctx.restore();
}

function drawTrips(now) {
  for (var i = 0; i < trips.length; i++) {
    var t = trips[i], el = now - t.t0;
    if (el < 0 || el >= t.total) continue;
    var x, y, carrying = false, scale = 1, alpha = 1;
    var step = Math.sin(el * 0.045) * 1.4; // little stepping shuffle
    if (el < t.outDur) {
      var q = easeCrawl(el / t.outDur);
      var w = Math.sin(q * Math.PI * 6) * t.wob * Math.sin(q * Math.PI);
      x = t.x0 + (t.x1 - t.x0) * q + t.nx * w;
      y = t.y0 + (t.y1 - t.y0) * q + t.ny * w + step * 0.35;
      if (el < 240) scale = 0.3 + 0.7 * (el / 240); // climb out of the hole
    } else if (el < t.outDur + TRIP_BITE) {
      x = t.x1;
      y = t.y1 + Math.sin((el - t.outDur) / TRIP_BITE * Math.PI * 4) * 1.6; // nibble
    } else {
      var e2 = (el - t.outDur - TRIP_BITE) / t.backDur;
      var q2 = easeCrawl(e2);
      var w2 = Math.sin(q2 * Math.PI * 6) * t.wob * Math.sin(q2 * Math.PI);
      x = t.x1 + (t.x0 - t.x1) * q2 + t.nx * w2;
      y = t.y1 + (t.y0 - t.y1) * q2 + t.ny * w2 + step * 0.35;
      carrying = true;
      var remain = t.total - el;
      if (remain < 280) { // sink back into the hole
        var k = Math.max(0, remain / 280);
        scale = 0.25 + 0.75 * k;
        alpha = 0.2 + 0.8 * k;
      }
    }
    drawAnt(x, y, t.color, carrying, scale, alpha);
  }
}

function drawFx(now) {
  var i, f, p;
  for (i = 0; i < flashes.length; i++) {
    f = flashes[i];
    if (now < f.t0) continue;
    p = (now - f.t0) / 160;
    if (p >= 1) continue;
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.9 * (1 - p)) + ')';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(f.x, f.y, 3 + p * cell * 0.45, 0, 6.3); ctx.stroke();
  }
  for (i = 0; i < particles.length; i++) {
    var pt = particles[i];
    if (now < pt.t0) continue;
    p = (now - pt.t0) / pt.life;
    if (p >= 1) continue;
    var dt = (now - pt.t0) / 1000;
    ctx.globalAlpha = 1 - p;
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x + pt.vx * dt - 2, pt.y + pt.vy * dt - 2, 4, 4);
    ctx.globalAlpha = 1;
  }
}

function drawNest() {
  ctx.fillStyle = 'rgba(120,85,40,.10)';
  rr(0, nestY, cssW, nestH - 8, 10); ctx.fill();
  for (var i = 0; i < Core.MAX_SLOTS; i++) {
    var g = slotGeom[i];
    var w = cssW / Core.MAX_SLOTS - 12, h = 62;
    var x = g.cx - w / 2, y = nestY + 8;
    var slot = sim.slots[i];
    // Nest hole mouth: ants climb out of it and burrow back in.
    ctx.fillStyle = '#3a2a18';
    ctx.beginPath(); ctx.ellipse(g.cx, g.cy - 12, 10, 7, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#1f150c';
    ctx.beginPath(); ctx.ellipse(g.cx, g.cy - 12, 6.5, 4.5, 0, 0, 6.3); ctx.fill();
    if (slot) {
      ctx.fillStyle = hexA(slot.color, 0.30);
      rr(x, y, w, h, 8); ctx.fill();
      ctx.lineWidth = slotIdle[i] ? 3 : 2;
      ctx.strokeStyle = slotIdle[i] ? '#e08a3c' : hexA(slot.color, 0.95);
      if (slotIdle[i]) ctx.setLineDash([6, 4]);
      rr(x, y, w, h, 8); ctx.stroke();
      ctx.setLineDash([]);
      var n = Math.min(slot.ants, 4);
      ctx.fillStyle = '#2e2a26';
      for (var a = 0; a < n; a++) {
        ctx.beginPath(); ctx.arc(x + 14 + a * 15, y + 20, 4.5, 0, 6.3); ctx.fill();
      }
      ctx.fillStyle = '#5a3d1e';
      ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('×' + slot.ants, x + 12, y + h - 10);
    } else {
      ctx.strokeStyle = 'rgba(120,85,40,.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      rr(x, y, w, h, 8); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function draw(now) {
  ctx.clearRect(0, 0, cssW, cssH);
  if (!parsed || !sim) return;
  var i, p, c;
  for (i = 0; i < parsed.cells.length; i++) {
    var hp = Core.getHp(sim.hp, i);
    if (hp <= 0) continue;
    c = parsed.cells[i];
    p = { x: ox + c.x * cell, y: c.y * cell };
    ctx.fillStyle = c.color;
    ctx.fillRect(p.x + 0.5, p.y + 0.5, cell - 1, cell - 1);
    if (c.maxHp > 1) {
      ctx.font = 'bold ' + Math.round(cell * 0.44) + 'px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.5)';
      var tx = p.x + cell / 2, ty = p.y + cell / 2 + 1;
      ctx.strokeText(hp, tx, ty);
      ctx.fillStyle = '#fff';
      ctx.fillText(hp, tx, ty);
    }
    if (exposedCache && exposedCache[i] && deployedColors && deployedColors[c.color]) {
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x + 2.5, p.y + 2.5, cell - 5, cell - 5);
    }
  }
  drawNest();
  drawTrips(now);
  drawFx(now);
}

function loop(now) {
  requestAnimationFrame(loop);
  trips = trips.filter(function (t) { return now - t.t0 < t.total + 60; });
  particles = particles.filter(function (p) { return now - p.t0 < p.life + 50; });
  flashes = flashes.filter(function (f) { return now - f.t0 < 220; });
  draw(now);
}

/* ---------------- boot ---------------- */
if (startBtn) {
  startBtn.textContent = '🍃 Levels';
  startBtn.addEventListener('click', showLevelSelect);
}
window.addEventListener('resize', function () { if (parsed) layout(); });
showLevelSelect();
requestAnimationFrame(loop);

})();
