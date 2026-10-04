#!/usr/bin/env node
/* Crumb Trail level solver / verifier.
 * Usage: node scripts/solve.js
 * BFS over deploy choices (deploy one reachable tray box, then eating runs
 * to fixpoint). Exits non-zero if any level is unsolvable.
 */
'use strict';
const path = require('path');
const Core = require(path.join(__dirname, '..', 'static', 'js', 'games', 'crumb-trail-core.js'));
const levels = require(path.join(__dirname, '..', 'static', 'js', 'games', 'crumb-trail-levels.js'));

const NAMES = {
  '#b9835a': 'tea', '#2e2a26': 'pearl', '#f7efdd': 'cream',
  '#ef6a9c': 'berry', '#7fb069': 'leaf', '#a78bfa': 'taro', '#fffdf7': 'coconut'
};
const cname = (hex) => NAMES[hex] || hex;

let failed = 0;
levels.forEach((level, li) => {
  const parsed = Core.parseLevel(level);
  const colors = new Set(parsed.cells.map((c) => c.color)).size;
  const multi = parsed.cells.filter((c) => c.maxHp > 1).length;
  console.log(`\n=== Level ${li + 1}: ${level.name} (${parsed.W}x${parsed.H}, ` +
    `${parsed.cells.length} cells, ${colors} colors, ${multi} multi-bite, ` +
    `${level.tray.length} tray boxes) ===`);
  const t0 = Date.now();
  const res = Core.solveLevel(parsed, level);
  console.log(`solver: ${Date.now() - t0}ms, states explored: ${res.explored}`);
  if (!res.solvable) {
    console.log('RESULT: UNSOLVABLE');
    failed++;
    return;
  }
  console.log('solution deploy order: ' +
    res.deployOrder.map((b) => `${cname(b.color)}x${b.ants}`).join(' -> '));
  const tc = Core.countTicks(parsed, level, res.deployOrder);
  console.log(`eager-play ticks: ${tc.ticks}, win: ${tc.win}`);
  if (!tc.win) { console.log('RESULT: solution does not win in real-time sim'); failed++; return; }
  console.log('RESULT: SOLVABLE');
});
console.log(failed ? `\n${failed} level(s) FAILED` : '\nAll levels solvable.');
process.exit(failed ? 1 : 0);
