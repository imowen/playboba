/* Boba Garden - shared simulation core (no DOM, no canvas).
 *
 * UMD: exposes window.BobaGardenCore in the browser and works with
 * require() in Node, so the economy can be unit-tested headlessly.
 *
 * Model:
 *  - Garden: size x size plots (3 -> 4 -> 5 via paid expansion).
 *  - Plot: { crop: index into CROPS | -1, plantedAt: epoch ms | 0 }.
 *  - Growth is pure time: stage = f(elapsed / growMs), 3 visual stages.
 *  - Harvest is manual (tap a mature plot); offline time auto-harvests and
 *    auto-sells so returning players get a satisfying payout.
 *  - Coins are the only currency. Seeds cost coins, harvests sell instantly.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BobaGardenCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // id, display name, seed cost, grow time, sell price. All original.
  var CROPS = [
    { id: 'tea',   name: 'Tea Leaves',  seed: 10,  growMs: 30 * 1000,  sell: 22  },
    { id: 'taro',  name: 'Taro',        seed: 40,  growMs: 150 * 1000, sell: 95  },
    { id: 'pearl', name: 'Boba Pearls', seed: 150, growMs: 480 * 1000, sell: 380 }
  ];

  var SIZES = [3, 4, 5];
  var EXPAND_COST = { 3: 500, 4: 2500 }; // cost to grow FROM this size
  var START_COINS = 60;
  var MAX_OFFLINE_MS = 12 * 3600 * 1000; // offline gains capped at 12h

  function newGame(now) {
    return {
      v: 1,
      coins: START_COINS,
      size: 3,
      plots: emptyPlots(9),
      selected: 0,
      createdAt: now,
      lastSeen: now,
      stats: { earned: 0, planted: 0, harvested: 0 }
    };
  }

  function emptyPlots(n) {
    var p = [];
    for (var i = 0; i < n; i++) p.push({ crop: -1, plantedAt: 0 });
    return p;
  }

  function plotCount(state) { return state.size * state.size; }

  // 0 = empty, 1 = seed, 2 = sprout, 3 = mature. Pure function of time.
  function stageOf(plot, now) {
    if (plot.crop < 0) return 0;
    var crop = CROPS[plot.crop];
    var el = now - plot.plantedAt;
    if (el < 0) el = 0;
    if (el >= crop.growMs) return 3;
    var frac = el / crop.growMs;
    return frac < 0.33 ? 1 : 2;
  }

  function progressOf(plot, now) {
    if (plot.crop < 0) return 0;
    var crop = CROPS[plot.crop];
    return Math.min(1, Math.max(0, (now - plot.plantedAt) / crop.growMs));
  }

  function profitPerMin(cropIdx) {
    var c = CROPS[cropIdx];
    return (c.sell - c.seed) / (c.growMs / 60000);
  }

  function canPlant(state, i, cropIdx) {
    if (i < 0 || i >= plotCount(state)) return false;
    if (state.plots[i].crop >= 0) return false;
    if (cropIdx < 0 || cropIdx >= CROPS.length) return false;
    return state.coins >= CROPS[cropIdx].seed;
  }

  function plant(state, i, cropIdx, now) {
    if (!canPlant(state, i, cropIdx)) return false;
    state.coins -= CROPS[cropIdx].seed;
    state.plots[i] = { crop: cropIdx, plantedAt: now };
    state.stats.planted++;
    state.lastSeen = now;
    return true;
  }

  function harvest(state, i, now) {
    if (i < 0 || i >= plotCount(state)) return 0;
    var plot = state.plots[i];
    if (plot.crop < 0 || stageOf(plot, now) < 3) return 0;
    var gain = CROPS[plot.crop].sell;
    state.coins += gain;
    state.stats.earned += gain;
    state.stats.harvested++;
    state.plots[i] = { crop: -1, plantedAt: 0 };
    state.lastSeen = now;
    return gain;
  }

  function maturePlots(state, now) {
    var out = [];
    for (var i = 0; i < plotCount(state); i++) {
      if (stageOf(state.plots[i], now) === 3) out.push(i);
    }
    return out;
  }

  function expandCost(state) {
    return EXPAND_COST[state.size] || 0;
  }

  function canExpand(state) {
    return !!EXPAND_COST[state.size] && state.coins >= EXPAND_COST[state.size];
  }

  function expand(state) {
    if (!canExpand(state)) return false;
    state.coins -= EXPAND_COST[state.size];
    state.size += 1;
    var need = plotCount(state) - state.plots.length;
    for (var k = 0; k < need; k++) state.plots.push({ crop: -1, plantedAt: 0 });
    return true;
  }

  // Offline settlement: crops keep growing while away; anything that matured
  // is auto-harvested and auto-sold. Returns a report for the welcome-back
  // modal. Pure w.r.t. the returned report; mutates state economy.
  function settleOffline(state, now) {
    var awayMs = Math.min(MAX_OFFLINE_MS, Math.max(0, now - state.lastSeen));
    var report = { awayMs: awayMs, harvested: 0, earned: 0, grew: 0 };
    if (awayMs < 1000) { state.lastSeen = now; return report; }
    for (var i = 0; i < plotCount(state); i++) {
      var plot = state.plots[i];
      if (plot.crop < 0) continue;
      var st = stageOf(plot, now);
      if (st === 3) {
        var gain = CROPS[plot.crop].sell;
        state.coins += gain;
        state.stats.earned += gain;
        state.stats.harvested++;
        state.plots[i] = { crop: -1, plantedAt: 0 };
        report.harvested++;
        report.earned += gain;
      } else if (st > 0) {
        report.grew++;
      }
    }
    state.lastSeen = now;
    return report;
  }

  function cloneState(s) { return JSON.parse(JSON.stringify(s)); }

  return {
    CROPS: CROPS,
    SIZES: SIZES,
    EXPAND_COST: EXPAND_COST,
    START_COINS: START_COINS,
    MAX_OFFLINE_MS: MAX_OFFLINE_MS,
    newGame: newGame,
    plotCount: plotCount,
    stageOf: stageOf,
    progressOf: progressOf,
    profitPerMin: profitPerMin,
    canPlant: canPlant,
    plant: plant,
    harvest: harvest,
    maturePlots: maturePlots,
    expandCost: expandCost,
    canExpand: canExpand,
    expand: expand,
    settleOffline: settleOffline,
    cloneState: cloneState
  };
}));
