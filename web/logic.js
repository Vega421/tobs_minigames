// Game logic for the web minigames, without any drawing, so it runs in Node too
// and can be tested outside the game. The page uses it as window.MGLogic.
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

  // FINGERPRINT: pick the 4 pieces (bands 0-3, top to bottom) of
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
  // How many pieces a row of the grid holds: 2 like the Casino's clone screen, 3 when there are many
  L.fpColumns = (count) => (count > 10 ? 3 : 2);
  // The cursor on the grid of pieces: up / down / left / right, stopping at the edges
  L.fpMove = function (cursor, dir, count, cols) {
    const row = Math.floor(cursor / cols), col = cursor % cols, rows = Math.ceil(count / cols);
    let r = row, c = col;
    if (dir === 'up') r = Math.max(0, row - 1);
    else if (dir === 'down') r = Math.min(rows - 1, row + 1);
    else if (dir === 'left') c = Math.max(0, col - 1);
    else if (dir === 'right') c = Math.min(cols - 1, col + 1);
    const next = r * cols + c;
    return next < count ? next : cursor;
  };
  // Scramble: the same pieces in a new order, never the order they had
  L.fpScramble = function (rand, pieces) {
    if (pieces.length < 2) return pieces.slice();
    let next;
    do { next = L.shuffle(rand, pieces); } while (next.every((p, i) => p === pieces[i]));
    return next;
  };

  // The ridge lines of a print as polylines of {x, y} points in 0-1, different for every seed. The
  // page draws them on a tall canvas (0.6 wide for 1 high), so they're made in that shape: a fingertip
  // oval holding one of three real patterns (a whorl, a loop or an arch) with only a slight wave, so
  // the bands of one print are easy to tell from another's.
  const PRINT_ASPECT = 0.6;
  L.ridges = function (seed) {
    const rand = L.random(seed);
    const A = PRINT_ASPECT;
    const type = ['whorl', 'loop', 'arch'][L.int(rand, 0, 2)];
    const cx = A / 2 + (rand() - 0.5) * 0.08, cy = 0.44 + (rand() - 0.5) * 0.1;
    const wave = { amp: 0.003 + rand() * 0.004, k: 10 + rand() * 12, phase: rand() * Math.PI * 2 };
    const slant = (rand() < 0.5 ? -1 : 1) * (0.15 + rand() * 0.2); // which way a loop's legs lean
    // the fingertip: an oval; lines are cut where they leave it
    const inside = (X, Y) => ((X - A / 2) / (A * 0.47)) ** 2 + ((Y - 0.52) / 0.47) ** 2 <= 1;
    const lines = [];
    const add = (pts) => {
      let line = [];
      for (const [X, Y0] of pts) {
        const Y = Y0 + wave.amp * Math.sin(wave.k * X + wave.phase + Y0 * 6);
        if (!inside(X, Y) || rand() < 0.012) { if (line.length > 1) lines.push(line); line = []; continue; } // the edge, or a ridge ending
        line.push({ x: X / A, y: Y });
      }
      if (line.length > 1) lines.push(line);
    };
    if (type === 'whorl') {
      for (let k = 1; k <= 13; k++) {
        const r = k * 0.028, pts = [];
        for (let s = 0; s <= 80; s++) {
          const a = (s / 80) * Math.PI * 2;
          pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.3]);
        }
        add(pts);
      }
    } else if (type === 'loop') {
      for (let k = 1; k <= 12; k++) {
        const r = k * 0.024, pts = [];
        // one leg up, over the top of the core, and the other leg down, both leaning the same way
        for (let s = 0; s <= 30; s++) { const Y = 1 - (s / 30) * (1 - cy); pts.push([cx - r + slant * (Y - cy), Y]); }
        for (let s = 1; s < 40; s++) { const a = Math.PI - (s / 40) * Math.PI; pts.push([cx + Math.cos(a) * r, cy - Math.sin(a) * r * 1.4]); }
        for (let s = 0; s <= 30; s++) { const Y = cy + (s / 30) * (1 - cy); pts.push([cx + r + slant * (Y - cy), Y]); }
        add(pts);
      }
      // arches over the loop
      for (let k = 1; k <= 6; k++) {
        const top = cy - 12 * 0.024 * 1.4 - k * 0.034, pts = [];
        for (let s = 0; s <= 60; s++) { const X = (s / 60) * A; pts.push([X, top + 0.1 * ((X - cx) / A) ** 2 * 4]); }
        add(pts);
      }
    } else {
      const n = 22;
      for (let k = 0; k < n; k++) {
        const base = 0.06 + k * 0.043, h = 0.03 + 0.09 * Math.sin((Math.PI * (k + 1)) / (n + 1)), pts = [];
        for (let s = 0; s <= 60; s++) { const X = (s / 60) * A; pts.push([X, base - h * Math.exp(-(((X - cx) / 0.16) ** 2))]); }
        add(pts);
      }
    }
    return lines;
  };


  // HOTWIRE: connect each wire to the terminal that names its colour. With `tricky`, the names are
  // printed in other colours

  L.makeHotwire = function (rand, count, tricky) {
    count = Math.max(2, Math.min(count, L.COLORS.length));
    const wires = L.shuffle(rand, L.COLORS).slice(0, count);
    const names = L.shuffle(rand, wires);
    const terminals = names.map((name, i) => {
      let ink = name;
      if (tricky) {
        const others = wires.filter((c) => c !== name);
        ink = others[Math.floor(rand() * others.length)];
      }
      return { name, ink };
    });
    return { wires, terminals };
  };
  // Connecting wire w to terminal t when `connected` (a list of wire indexes) are done:
  // "ok", "done" (the last one), "used" (already connected) or "wrong"
  L.connectWire = function (puzzle, connected, w, t) {
    if (connected.includes(w) || !puzzle.terminals[t]) return 'used';
    if (puzzle.terminals[t].name !== puzzle.wires[w]) return 'wrong';
    return connected.length + 1 === puzzle.wires.length ? 'done' : 'ok';
  };

  // LASER GRID: the room is 1 wide and L.ROOM_H high; the player starts on the left and leaves on
  // the right. Walls of laser cross the room, each with an opening that slides up and down (some
  // walls also blink off). Short beams sweep up and down between the walls.

  L.ROOM_H = 0.56;
  L.PLAYER_R = 0.018;
  // gap: the opening's height (share of the room); speed: how fast things move
  L.makeLasers = function (rand, walls, sweepers, speed, gap) {
    const beams = [];
    for (let i = 0; i < walls; i++) {
      const x = 0.16 + ((i + 0.5) / walls) * 0.68;
      const blink = rand() < 0.3 ? { on: 1.4 + rand(), off: 0.8 + rand() * 0.5, phase: rand() * 2 } : null;
      beams.push({ axis: 'v', x, gap: gap * L.ROOM_H, base: L.ROOM_H / 2, amp: L.ROOM_H * (0.5 - gap / 2) * 0.9,
                   speed: speed * (0.5 + rand() * 0.6), phase: rand() * 6.3, blink });
    }
    for (let i = 0; i < sweepers; i++) {
      // between two walls (or the start and the first wall)
      const edges = [0.08].concat(beams.map((b) => b.x), [0.92]);
      const k = Math.floor(rand() * (edges.length - 1));
      const from = edges[k] + 0.025, to = edges[k + 1] - 0.025;
      beams.push({ axis: 'h', from, to, base: L.ROOM_H / 2, amp: L.ROOM_H * 0.4,
                   speed: speed * (0.6 + rand() * 0.6), phase: rand() * 6.3, blink: null });
    }
    return beams;
  };
  // A wall's opening centre, or a sweeping beam's height, at time t
  L.beamPos = (b, t) => b.base + Math.sin(t * b.speed * 2 + b.phase) * b.amp;
  L.beamOn = function (b, t) {
    if (!b.blink) return true;
    const cycle = b.blink.on + b.blink.off;
    return ((t + b.blink.phase) % cycle) < b.blink.on;
  };
  // Does the player at p = {x, y} touch a beam that's on at time t?
  L.laserHit = function (p, beams, t) {
    const r = L.PLAYER_R;
    return beams.some((b) => {
      if (!L.beamOn(b, t)) return false;
      const pos = L.beamPos(b, t);
      if (b.axis === 'v') return Math.abs(p.x - b.x) <= r && Math.abs(p.y - pos) > b.gap / 2 - r;
      return p.x + r >= b.from && p.x - r <= b.to && Math.abs(p.y - pos) <= r;
    });
  };
  // Moves the player by input = {up, down, left, right} for dt seconds at `speed` room widths per second
  L.moveDot = function (p, input, dt, speed) {
    let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
    dt = Math.max(0, Math.min(dt, 0.1));
    return {
      x: Math.max(L.PLAYER_R, Math.min(1 - L.PLAYER_R, p.x + dx * speed * dt)),
      y: Math.max(L.PLAYER_R, Math.min(L.ROOM_H - L.PLAYER_R, p.y + dy * speed * dt)),
    };
  };
  L.LASER_START = { x: 0.04, y: L.ROOM_H / 2 };
  L.laserExit = (p) => p.x >= 0.95;

  // KEY FILING: file each cut of a blank key down to its depth (0 = untouched, 1 = through)

  L.makeKeyCuts = (rand, count) => Array.from({ length: count }, () => 0.25 + rand() * 0.55);
  // A time step is never negative (a browser's first frame can be stamped a moment early) or longer than 0.1 s
  L.step = (dt) => Math.max(0, Math.min(dt, 0.1));
  L.fileCut = (depth, dt, speed) => Math.min(1, depth + speed * L.step(dt));
  L.cutOk = (depth, target, tol) => Math.abs(depth - target) <= tol;
  L.cutRuined = (depth, target, tol) => depth > target + tol;
  L.keyDone = (depths, targets, tol) => depths.every((d, i) => L.cutOk(d, targets[i], tol));

  // TRACKER SWEEP: find the tracker hidden on a car (1 wide, L.ROOM_H high) by its signal. Decoys
  // (the car's electronics) give a weaker signal.

  L.makeTracker = function (rand, decoys) {
    const spot = () => ({ x: 0.18 + rand() * 0.64, y: L.ROOM_H * (0.22 + rand() * 0.56) });
    const tracker = spot();
    const others = [];
    while (others.length < decoys) {
      const d = spot();
      if (Math.hypot(d.x - tracker.x, d.y - tracker.y) > 0.2) others.push(d);
    }
    return { tracker, decoys: others };
  };
  // Signal strength 0-1 at p: strongest over the tracker, at most 0.6 over a decoy
  L.signal = function (p, puzzle, range = 0.45) {
    const s = (q, max) => Math.max(0, max * (1 - Math.hypot(p.x - q.x, p.y - q.y) / range));
    return Math.max(s(puzzle.tracker, 1), ...puzzle.decoys.map((d) => s(d, 0.6)), 0);
  };
  L.trackerFound = (p, puzzle, radius) => Math.hypot(p.x - puzzle.tracker.x, p.y - puzzle.tracker.y) <= radius;

  root.MGLogic = L;
  if (typeof module !== 'undefined' && module.exports) module.exports = L;
})(typeof window !== 'undefined' ? window : globalThis);
