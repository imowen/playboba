/* Crumb Trail - level data. 100% original pixel art and level design.
 * UMD: window.CrumbTrailLevels in the browser, require() in Node (solver).
 *
 * Legend chars map to {color, hp}. Multi-bite cells use a separate char
 * (e.g. 't' is a 2-bite boba pearl of the same color as 'P').
 * Tray is front-first; the player may take any of the first 4 boxes.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CrumbTrailLevels = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TEA = '#b9835a';    // milk tea
  var PEARL = '#2e2a26';  // boba pearls
  var CREAM = '#f7efdd';  // milk foam / cup
  var BERRY = '#ef6a9c';  // strawberry
  var LEAF = '#7fb069';   // mint / leaves
  var TARO = '#a78bfa';   // taro
  var COCO = '#fffdf7';   // coconut jelly

  return [
    {
      id: 'boba-cup',
      name: 'Boba Cup',
      sub: 'Tutorial - 3 colors',
      grid: [
        '........',
        '.MMMMMM.',
        '.MTTTTM.',
        '.MTTTTM.',
        '.MTTTTM.',
        '.MTPPTM.',
        '.MTPPTM.',
        '.MMMMMM.'
      ],
      legend: {
        M: { color: CREAM, hp: 1 },
        T: { color: TEA, hp: 1 },
        P: { color: PEARL, hp: 1 }
      },
      // Front-first. Cream (the exposed cup edge) comes first so the very
      // first tap is instantly rewarding; tea and pearls get exposed as the
      // cup is nibbled away, teaching the outside-in rule naturally.
      tray: [
        { color: CREAM, ants: 2 },
        { color: TEA, ants: 2 },
        { color: PEARL, ants: 1 }
      ]
    },
    {
      id: 'strawberry',
      name: 'Strawberry',
      sub: '4 colors - mind the order',
      grid: [
        '..........',
        '...GGGG...',
        '..GGGGGG..',
        '.SSSSSSSS.',
        '.SSSPSSSS.',
        '.SSSSSPSS.',
        '.SSMSSSSS.',
        '..SSSSSS..',
        '...SSSS...',
        '..........'
      ],
      legend: {
        G: { color: LEAF, hp: 1 },
        S: { color: BERRY, hp: 1 },
        P: { color: PEARL, hp: 1 },
        M: { color: CREAM, hp: 1 }
      },
      // Seeds and shine are buried inside the berry: deploy leaves/berry first.
      tray: [
        { color: PEARL, ants: 1 },
        { color: CREAM, ants: 1 },
        { color: BERRY, ants: 2 },
        { color: LEAF, ants: 2 }
      ]
    },
    {
      id: 'milk-tea-feast',
      name: 'Milk Tea Feast',
      sub: '6 colors - don\'t clog the nest',
      grid: [
        '.....MM.....',
        '.....MM.....',
        '..MMMMMMMM..',
        '..MTTTTTTM..',
        '..MTSSTTTM..',
        '..MTWWTTTM..',
        '..MTTTTTTM..',
        '..MTTTTTTM..',
        '..MTtBTtTM..',
        '..MTtBTtTM..',
        '..MMMMMMMM..',
        '............'
      ],
      legend: {
        M: { color: CREAM, hp: 1 },
        T: { color: TEA, hp: 1 },
        S: { color: BERRY, hp: 1 },
        W: { color: COCO, hp: 1 },
        t: { color: PEARL, hp: 2 }, // chewy pearls: 2 bites each
        B: { color: TARO, hp: 1 }
      },
      // The cream cup is the only exposed color at first - it sits at tray
      // position 2 among buried temptations. Deploying 5 buried colors
      // before it clogs every slot and loses the level.
      tray: [
        { color: PEARL, ants: 2 },
        { color: CREAM, ants: 3 },
        { color: BERRY, ants: 2 },
        { color: TARO, ants: 1 },
        { color: COCO, ants: 1 },
        { color: TEA, ants: 2 },
        { color: TEA, ants: 1 }
      ]
    }
  ];
}));
