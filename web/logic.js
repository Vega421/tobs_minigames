// Game logic for the web minigames, without any drawing, so it runs in Node too
// (tests/web/logic.test.js). The page uses it as window.MGLogic.
(function (root) {
  'use strict';
  const L = {};

  // A small seeded random number generator (mulberry32): the same seed gives the same game
  L.random = function (seed) {
    let a = (seed === undefined ? Math.floor(Math.random() * 4294967296) : seed) >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  L.int = (rand, min, max) => min + Math.floor(rand() * (max - min + 1));
  L.shuffle = function (rand, list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // KEYPAD: a code of digits

  L.keypadCode = function (rand, length) {
    let code = '';
    for (let i = 0; i < length; i++) code += String(L.int(rand, 0, 9));
    return code;
  };
  L.keypadCheck = (code, input) => String(input) === String(code);

  // THERMITE: remember which squares of a grid lit up

  // `count` different squares (0 .. size*size-1) of a size x size grid
  L.thermiteSquares = function (rand, size, count) {
    const all = [...Array(size * size).keys()];
    return L.shuffle(rand, all).slice(0, Math.max(1, Math.min(count, all.length)));
  };
  // Clicking square i when `found` squares are already found: "hit", "done" (the last one),
  // "again" (already found) or "miss"
  L.thermiteClick = function (squares, found, i) {
    if (found.includes(i)) return 'again';
    if (!squares.includes(i)) return 'miss';
    return found.length + 1 === squares.length ? 'done' : 'hit';
  };

  // WIRES: every wire has its own colour, so each clue points at exactly one wire

  L.COLORS = ['red', 'blue', 'yellow', 'green', 'white', 'black', 'orange', 'purple'];

  // {colors (top to bottom), order (wire indexes to cut, in order), clues (one per cut)}
  L.makeWires = function (rand, count, cuts) {
    count = Math.max(2, Math.min(count, L.COLORS.length));
    cuts = Math.max(1, Math.min(cuts, count));
    const colors = L.shuffle(rand, L.COLORS).slice(0, count);
    const order = L.shuffle(rand, [...Array(count).keys()]).slice(0, cuts);
    return { colors, order, clues: order.map((i) => L.makeClue(rand, i, colors)) };
  };

  // A clue names a wire by its colour, its position, or the wire next to it
  L.makeClue = function (rand, i, colors) {
    const kinds = ['color', 'position'];
    if (i > 0) kinds.push('below');
    if (i < colors.length - 1) kinds.push('above');
    const kind = kinds[Math.floor(rand() * kinds.length)];
    if (kind === 'color') return { kind, color: colors[i] };
    if (kind === 'position') return { kind, n: i + 1 };
    if (kind === 'below') return { kind, color: colors[i - 1] }; // the wire right below this colour
    return { kind, color: colors[i + 1] }; // the wire right above this colour
  };

  L.clueTarget = function (clue, colors) {
    if (clue.kind === 'color') return colors.indexOf(clue.color);
    if (clue.kind === 'position') return clue.n - 1;
    if (clue.kind === 'below') return colors.indexOf(clue.color) + 1;
    if (clue.kind === 'above') return colors.indexOf(clue.color) - 1;
    return -1;
  };

  // Cutting wire i after `done` correct cuts: "ok", "done" (that was the last one) or "wrong"
  L.cutWire = function (puzzle, done, i) {
    if (puzzle.order[done] !== i) return 'wrong';
    return done + 1 === puzzle.order.length ? 'done' : 'ok';
  };

  // LOCKPICK: the pick sweeps along the lock; each pin has a sweet spot

  // Where the pick is after t seconds (0-1), going back and forth `speed` sweeps per second
  L.sweep = function (t, speed) {
    const x = (t * speed) % 2;
    return x <= 1 ? x : 2 - x;
  };
  // The centre of each pin's sweet spot, never touching the ends of the lock
  L.makePins = function (rand, count, zone) {
    const margin = zone / 2 + 0.05;
    return Array.from({ length: count }, () => margin + rand() * (1 - 2 * margin));
  };
  L.inZone = (pos, center, zone) => Math.abs(pos - center) <= zone / 2;

  // FINGERPRINT: pick the 4 pieces (0 top left, 1 top right, 2 bottom left, 3 bottom right) of
  // the print shown; decoys are pieces of other prints

  L.makeFingerprint = function (rand, decoys) {
    const seed = L.int(rand, 1, 1e9);
    const pieces = [0, 1, 2, 3].map((part) => ({ seed, part, correct: true }));
    for (let i = 0; i < decoys; i++) {
      let other = L.int(rand, 1, 1e9);
      if (other === seed) other += 1;
      pieces.push({ seed: other, part: L.int(rand, 0, 3), correct: false });
    }
    return { seed, pieces: L.shuffle(rand, pieces) };
  };
  L.fingerprintCheck = (pieces, selected) =>
    selected.length === 4 && new Set(selected).size === 4 && selected.every((i) => pieces[i] && pieces[i].correct);

  // The ridge lines of a print as polylines of {x, y} points in 0-1, different for every seed:
  // rings around a core, bent by a few waves, with gaps like real ridges
  L.ridges = function (seed) {
    const rand = L.random(seed);
    const cx = 0.4 + rand() * 0.2;
    const cy = 0.42 + rand() * 0.16;
    const waves = [1, 2, 3].map((k) => ({ k: k + L.int(rand, 0, 2), amp: 0.02 + rand() * 0.05, phase: rand() * Math.PI * 2 }));
    const stretch = 0.75 + rand() * 0.3;
    const lines = [];
    for (let ring = 1; ring <= 16; ring++) {
      const r = ring * 0.034;
      let line = [];
      for (let s = 0; s <= 72; s++) {
        const a = (s / 72) * Math.PI * 2;
        if (rand() < 0.035 && line.length > 1) { lines.push(line); line = []; continue; } // a gap
        let d = r;
        for (const w of waves) d += w.amp * r * 4 * Math.sin(w.k * a + w.phase + ring * 0.15);
        const x = cx + Math.cos(a) * d * stretch;
        const y = cy + Math.sin(a) * d;
        if (x < 0 || x > 1 || y < 0 || y > 1) { if (line.length > 1) lines.push(line); line = []; continue; }
        line.push({ x, y });
      }
      if (line.length > 1) lines.push(line);
    }
    return lines;
  };

  root.MGLogic = L;
  if (typeof module !== 'undefined' && module.exports) module.exports = L;
})(typeof window !== 'undefined' ? window : globalThis);
