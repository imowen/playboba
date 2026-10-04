/* Crumb Trail - shared simulation core (no DOM, no canvas).
 *
 * UMD: exposes window.CrumbTrailCore in the browser and works with
 * require() in Node. The browser game and the level solver use these exact
 * functions, so any level the solver clears is guaranteed clearable in-game.
 *
 * Model:
 *  - Board: grid of cells, each {x, y, color, maxHp}. '.'/space = empty.
 *  - A cell is EXPOSED when an ant could reach it: it touches outside air
 *    (empty cells flood-connected to the grid border, or the border itself)
 *    or an already-eaten cell. Eating therefore works from the outside in.
 *  - Tray: ordered queue of boxes {color, ants}. The player may deploy any
 *    of the first REACHABLE boxes (the "front" of the tray).
 *  - Nest: up to MAX_SLOTS slots. Deploying a box whose color already has a
 *    slot merges its ants in; otherwise it needs a free slot.
 *  - Eating is monotone (bites only reduce hp), so the fixpoint reached by
 *    repeatedly ticking does not depend on bite order.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CrumbTrailCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MAX_SLOTS = 5;   // nest slots
  var REACHABLE = 4;   // front tray boxes the player may take
  var TICK_MS = 600;   // ms per eating tick in the game
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // ---------------- level parsing ----------------
  // level = { id, name, grid: [strings], legend: {ch: {color:'#hex', hp}},
  //           tray: [{color:'#hex', ants}] }  (tray is front-first)
  function parseLevel(level) {
    var H = level.grid.length, W = level.grid[0].length, x, y;
    var cells = [], indexOf = {};
    for (y = 0; y < H; y++) {
      if (level.grid[y].length !== W) throw new Error('ragged grid row ' + y + ' in ' + level.id);
      for (x = 0; x < W; x++) {
        var ch = level.grid[y][x];
        if (ch === '.' || ch === ' ') continue;
        var def = level.legend[ch];
        if (!def) throw new Error('unknown legend char "' + ch + '" in ' + level.id);
        indexOf[x + ',' + y] = cells.length;
        cells.push({ x: x, y: y, color: def.color, maxHp: def.hp || 1 });
      }
    }
    // "outside air": empty cells flood-connected to the grid border
    var air = {}, seen = {}, stack = [];
    function pushAir(x, y) {
      var k = x + ',' + y;
      if (indexOf[k] !== undefined || seen[k]) return;
      seen[k] = 1; stack.push([x, y]);
    }
    for (x = 0; x < W; x++) { pushAir(x, 0); pushAir(x, H - 1); }
    for (y = 0; y < H; y++) { pushAir(0, y); pushAir(W - 1, y); }
    while (stack.length) {
      var p = stack.pop();
      air[p[0] + ',' + p[1]] = 1;
      for (var d = 0; d < 4; d++) {
        var nx = p[0] + DIRS[d][0], ny = p[1] + DIRS[d][1];
        if (nx >= 0 && ny >= 0 && nx < W && ny < H) pushAir(nx, ny);
      }
    }
    return { W: W, H: H, cells: cells, indexOf: indexOf, air: air };
  }

  // ---------------- remaining hp, packed as base-3 BigInt ----------------
  function getHp(hp, i) { return Number((hp / (3n ** BigInt(i))) % 3n); }
  function setHp(hp, i, v) {
    var p = 3n ** BigInt(i);
    return hp + (BigInt(v) - (hp / p) % 3n) * p;
  }
  function initialHp(parsed) {
    var hp = 0n;
    for (var i = 0; i < parsed.cells.length; i++) hp = setHp(hp, i, parsed.cells[i].maxHp);
    return hp;
  }
  function isEaten(hp, i) { return getHp(hp, i) <= 0; }

  function isExposed(parsed, hp, i) {
    if (isEaten(hp, i)) return false;
    var c = parsed.cells[i];
    for (var d = 0; d < 4; d++) {
      var nx = c.x + DIRS[d][0], ny = c.y + DIRS[d][1];
      if (nx < 0 || ny < 0 || nx >= parsed.W || ny >= parsed.H) return true;
      var k = nx + ',' + ny;
      if (parsed.air[k]) return true;
      var j = parsed.indexOf[k];
      if (j !== undefined && isEaten(hp, j)) return true;
    }
    return false;
  }

  // Deterministic target: first exposed cell of the color in row-major order.
  function firstExposedOfColor(parsed, hp, color) {
    for (var i = 0; i < parsed.cells.length; i++) {
      if (parsed.cells[i].color === color && isExposed(parsed, hp, i)) return i;
    }
    return -1;
  }

  // ---------------- states ----------------
  // state = { hp: BigInt, slots: [{color, ants}], tray: [{color, ants}] }
  function initialState(parsed, level) {
    return {
      hp: initialHp(parsed),
      slots: [],
      tray: level.tray.map(function (b) { return { color: b.color, ants: b.ants }; })
    };
  }

  function cloneState(s) {
    return {
      hp: s.hp,
      slots: s.slots.map(function (x) { return { color: x.color, ants: x.ants }; }),
      tray: s.tray.map(function (x) { return { color: x.color, ants: x.ants }; })
    };
  }

  // Deploy tray[trayIdx] into the nest. Returns the new state, or null when
  // illegal (no free slot and the color isn't already deployed).
  function deploy(state, trayIdx) {
    var box = state.tray[trayIdx];
    if (!box) return null;
    var ns = cloneState(state), ex = null, i;
    for (i = 0; i < ns.slots.length; i++) {
      if (ns.slots[i].color === box.color) { ex = ns.slots[i]; break; }
    }
    if (ex) ex.ants += box.ants;
    else {
      if (ns.slots.length >= MAX_SLOTS) return null;
      ns.slots.push({ color: box.color, ants: box.ants });
    }
    ns.tray.splice(trayIdx, 1);
    return ns;
  }

  // One eating tick: every ant bites one exposed cell of its slot's color.
  function eatTick(parsed, state) {
    var hp = state.hp, bites = [], s, a;
    for (s = 0; s < state.slots.length; s++) {
      var slot = state.slots[s];
      for (a = 0; a < slot.ants; a++) {
        var idx = firstExposedOfColor(parsed, hp, slot.color);
        if (idx < 0) break;
        var nhp = getHp(hp, idx) - 1;
        hp = setHp(hp, idx, nhp);
        bites.push({ cell: idx, color: slot.color, cleared: nhp <= 0 });
      }
    }
    // free slots whose color is fully cleared
    var alive = {}, i;
    for (i = 0; i < parsed.cells.length; i++) {
      if (getHp(hp, i) > 0) alive[parsed.cells[i].color] = 1;
    }
    var slots = [];
    for (s = 0; s < state.slots.length; s++) {
      if (alive[state.slots[s].color]) slots.push(state.slots[s]);
    }
    return { state: { hp: hp, slots: slots, tray: state.tray }, bites: bites };
  }

  // Run ticks until no ant can bite anymore. Terminates: every bite strictly
  // reduces total hp, and eating is monotone, so the fixpoint is unique.
  function eatToFixpoint(parsed, state) {
    var cur = state, guard = 0;
    for (;;) {
      var r = eatTick(parsed, cur);
      cur = r.state;
      if (!r.bites.length) return cur;
      if (++guard > 100000) throw new Error('fixpoint runaway');
    }
  }

  function isWin(parsed, state) {
    for (var i = 0; i < parsed.cells.length; i++) {
      if (getHp(state.hp, i) > 0) return false;
    }
    return true;
  }

  // Only meaningful at fixpoint (call after eatToFixpoint / a biteless tick):
  // cells remain but nothing will ever become edible.
  function isDead(parsed, state) {
    return !isWin(parsed, state) &&
      (state.tray.length === 0 || state.slots.length >= MAX_SLOTS);
  }

  function stateKey(state) {
    var slots = state.slots.map(function (s) { return s.color + ':' + s.ants; }).sort().join(';');
    var tray = state.tray.map(function (b) { return b.color + ':' + b.ants; }).join(';');
    return state.hp.toString(36) + '|' + slots + '|' + tray;
  }

  // ---------------- solver: BFS over deploy choices ----------------
  // Each action deploys one reachable tray box, then eating runs to fixpoint.
  function solveLevel(parsed, level) {
    var start = initialState(parsed, level);
    var visited = {}, queue = [{ state: start, path: [] }];
    visited[stateKey(start)] = 1;
    var explored = 0;
    while (queue.length) {
      var cur = queue.shift();
      explored++;
      var n = Math.min(REACHABLE, cur.state.tray.length);
      var seenBox = {};
      for (var ti = 0; ti < n; ti++) {
        var b = cur.state.tray[ti], dk = b.color + ':' + b.ants;
        if (seenBox[dk]) continue; // identical boxes are interchangeable
        seenBox[dk] = 1;
        var dep = deploy(cur.state, ti);
        if (!dep) continue;
        var settled = eatToFixpoint(parsed, dep);
        var step = { color: b.color, ants: b.ants };
        if (isWin(parsed, settled)) {
          return { solvable: true, deployOrder: cur.path.concat([step]), explored: explored };
        }
        if (isDead(parsed, settled)) continue; // dead end, prune
        var key = stateKey(settled);
        if (visited[key]) continue;
        visited[key] = 1;
        queue.push({ state: settled, path: cur.path.concat([step]) });
      }
    }
    return { solvable: false, explored: explored };
  }

  // Approximate real-time tick count for a deploy order, played eagerly:
  // deploy everything reachable/legal before each tick.
  function countTicks(parsed, level, order) {
    var st = initialState(parsed, level), oi = 0, ticks = 0, g;
    function tryDeployAll() {
      var moved = true;
      while (moved && oi < order.length) {
        moved = false;
        var want = order[oi], n = Math.min(REACHABLE, st.tray.length);
        for (var ti = 0; ti < n; ti++) {
          var b = st.tray[ti];
          if (b.color === want.color && b.ants === want.ants) {
            var ns = deploy(st, ti);
            if (ns) { st = ns; oi++; moved = true; break; }
          }
        }
      }
    }
    for (g = 0; g < 20000; g++) {
      if (isWin(parsed, st)) return { ticks: ticks, win: true };
      tryDeployAll();
      var r = eatTick(parsed, st);
      st = r.state; ticks++;
      if (!r.bites.length && isDead(parsed, st)) return { ticks: ticks, win: false };
    }
    return { ticks: ticks, win: false };
  }

  return {
    MAX_SLOTS: MAX_SLOTS,
    REACHABLE: REACHABLE,
    TICK_MS: TICK_MS,
    parseLevel: parseLevel,
    initialState: initialState,
    cloneState: cloneState,
    getHp: getHp,
    isEaten: isEaten,
    isExposed: isExposed,
    firstExposedOfColor: firstExposedOfColor,
    deploy: deploy,
    eatTick: eatTick,
    eatToFixpoint: eatToFixpoint,
    isWin: isWin,
    isDead: isDead,
    stateKey: stateKey,
    solveLevel: solveLevel,
    countTicks: countTicks
  };
}));
