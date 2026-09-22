// Draws and runs the web minigames. client/main.lua opens one with {action: "open", game, opts, text}
// and gets the result back through the "done" callback. The rules are in logic.js.
(function () {
  'use strict';
  const M = window.MGLogic;
  const $ = (id) => document.getElementById(id);
  // Outside FiveM (dev/preview.html) there's no game: results and sounds go to the page around this one
  const IN_GAME = typeof GetParentResourceName === 'function';
  const RESOURCE = IN_GAME ? GetParentResourceName() : 'tobs_minigames';
  const WIRE_HEX = { red: '#e5484d', blue: '#3e7bfa', yellow: '#f5d90a', green: '#30a46c', white: '#eceef2', black: '#1c1f26', orange: '#f76b15', purple: '#8e4ec6' };

  let game = null; // the running game: {name, o, t, ended, frame, timerEnd, onKey}

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  const fmt = (text, ...args) => { let i = 0; return text.replace(/%[sd]/g, () => String(args[i++])); };

  function post(name, data) {
    if (!IN_GAME) { window.parent.postMessage({ preview: name, data }, '*'); return; }
    fetch(`https://${RESOURCE}/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(data),
    }).catch(() => {});
  }

  function status(text) { $('mg-status').textContent = text || ''; }

  // A GTA sound through the game: "click", "move", "good", "bad", "success" or "fail"
  function sound(name) { post('sound', { name }); }

  // A countdown bar; the game fails when it runs out (fails = false: it only shows the time)
  function startTimer(seconds, fails = true) {
    game.timerEnd = performance.now() + seconds * 1000;
    game.timerLength = seconds * 1000;
    game.timerFails = fails;
  }
  function stopTimer() { game.timerEnd = null; $('mg-timer').style.transform = 'scaleX(1)'; }

  function loop(now) {
    if (!game || game.ended) return;
    if (game.timerEnd) {
      const left = game.timerEnd - now;
      $('mg-timer').style.transform = `scaleX(${Math.max(0, left / game.timerLength)})`;
      if (left <= 0 && game.timerFails) { finish(false, game.t.time_up); return; }
      if (left <= 0) game.timerEnd = null;
    }
    if (game.frame) game.frame(now);
    requestAnimationFrame(loop);
  }

  function finish(success, message) {
    if (!game || game.ended) return;
    game.ended = true;
    const result = $('mg-result');
    result.textContent = message || (success ? game.t.success : game.t.failed);
    result.className = success ? 'good' : 'bad';
    sound(success ? 'success' : 'fail');
    setTimeout(() => post('done', { success }), 900);
  }

  // MG.Theme from config.lua: colours for the CSS variables in style.css
  const THEME_VARS = { accent: '--brand', background: '--bg', text: '--text', muted: '--muted', good: '--good', bad: '--bad', gold: '--gold' };
  function applyTheme(theme) {
    const root = document.documentElement.style;
    for (const [key, cssVar] of Object.entries(THEME_VARS)) {
      if (theme && typeof theme[key] === 'string' && theme[key] !== '') root.setProperty(cssVar, theme[key]);
      else root.removeProperty(cssVar);
    }
  }

  function open(data) {
    const t = data.text;
    applyTheme(data.theme);
    game = { name: data.game, o: data.opts || {}, t, ended: false, rand: M.random(data.opts && data.opts.seed) };
    $('mg-title').textContent = t['title_' + data.game] || data.game;
    $('mg-hint').textContent = '';
    $('mg-giveup').textContent = t.give_up;
    $('mg-result').className = 'hidden';
    $('mg-body').innerHTML = '';
    status('');
    stopTimer();
    Games[data.game](game);
    $('mg').classList.remove('hidden');
    requestAnimationFrame(loop);
  }

  function close() {
    $('mg').classList.add('hidden');
    $('mg-body').innerHTML = '';
    game = null;
  }

  const Games = {};

  // KEYPAD: remember the code, then type it
  Games.keypad = function (g) {
    const o = g.o;
    const code = M.keypadCode(g.rand, o.length || 5);
    let attempts = o.attempts || 1;
    let input = '';
    let entering = false;
    const box = el('div', 'keypad');
    const shown = el('div', 'code', code);
    const flash = el('div', 'flash');
    const keys = el('div', 'keys');
    box.append(shown, flash, keys);
    $('mg-body').append(box);
    $('mg-hint').textContent = g.t.keypad_memorize;

    const showInput = () => { shown.textContent = input.padEnd(code.length, '•'); };
    const press = (k) => {
      if (!entering || g.ended) return;
      if (k !== 'enter') sound('click');
      if (k === 'clear') input = '';
      else if (k === 'back') input = input.slice(0, -1);
      else if (k === 'enter') {
        if (M.keypadCheck(code, input)) return finish(true);
        attempts -= 1;
        status(`${g.t.attempts}: ${attempts}`);
        if (attempts <= 0) return finish(false, g.t.keypad_wrong);
        sound('bad');
        flash.textContent = g.t.keypad_wrong;
        input = '';
      } else if (input.length < code.length) input += k;
      showInput();
    };
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'enter'].forEach((k) => {
      const b = el('button', k === 'enter' ? 'enter' : '', k === 'clear' ? g.t.clear : k === 'enter' ? g.t.enter : k);
      b.onclick = () => press(k);
      keys.append(b);
    });
    keys.style.visibility = 'hidden';
    startTimer((o.show || 2500) / 1000, false);
    g.onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('back');
      else if (e.key === 'Enter') press('enter');
    };
    setTimeout(() => {
      if (g.ended || game !== g) return;
      entering = true;
      shown.classList.add('hidden-code');
      keys.style.visibility = 'visible';
      $('mg-hint').textContent = g.t.keypad_enter;
      status(`${g.t.attempts}: ${attempts}`);
      showInput();
      startTimer(o.time || 15);
    }, o.show || 2500);
  };

  // THERMITE: remember the squares that light up, then click them
  Games.thermite = function (g) {
    const o = g.o;
    const size = o.size || 6;
    const squares = M.thermiteSquares(g.rand, size, o.squares || 7);
    const found = [];
    let mistakes = o.mistakes || 0;
    let clicking = false;
    const grid = el('div', 'grid');
    grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    const cells = [...Array(size * size).keys()].map((i) => {
      const c = el('div', 'cell' + (squares.includes(i) ? ' lit' : ''));
      c.onclick = () => {
        if (!clicking || g.ended) return;
        const r = M.thermiteClick(squares, found, i);
        if (r === 'again') return;
        if (r === 'miss') {
          c.classList.add('miss');
          mistakes -= 1;
          status(`${g.t.mistakes}: ${Math.max(0, mistakes)}`);
          if (mistakes < 0) return finish(false);
          return sound('bad');
        }
        found.push(i);
        c.classList.add('hit');
        if (r === 'done') return finish(true);
        sound('good');
      };
      grid.append(c);
      return c;
    });
    $('mg-body').append(grid);
    $('mg-hint').textContent = g.t.thermite_memorize;
    startTimer((o.show || 2500) / 1000, false);
    setTimeout(() => {
      if (g.ended || game !== g) return;
      clicking = true;
      cells.forEach((c) => c.classList.remove('lit'));
      $('mg-hint').textContent = g.t.thermite_click;
      status(`${g.t.mistakes}: ${mistakes}`);
      startTimer(o.time || 12);
    }, o.show || 2500);
  };

  // WIRES: cut them in the order of the clues
  Games.wires = function (g) {
    const o = g.o;
    const puzzle = M.makeWires(g.rand, o.wires || 5, o.cuts || 3);
    let done = 0;
    const wrap = el('div', 'wires');
    const wireBox = el('div', 'wire-box');
    const clues = el('ol', 'clues');
    const clueText = (c) => {
      if (c.kind === 'color') return fmt(g.t.clue_color, g.t[c.color]);
      if (c.kind === 'position') return fmt(g.t.clue_position, c.n);
      return fmt(c.kind === 'below' ? g.t.clue_below : g.t.clue_above, g.t['n_' + c.color]);
    };
    const items = puzzle.clues.map((c, i) => {
      const li = el('li', i === 0 ? 'current' : '', clueText(c));
      clues.append(li);
      return li;
    });
    puzzle.colors.forEach((color, i) => {
      const w = el('div', `wire wire-${color}`);
      w.style.backgroundColor = WIRE_HEX[color];
      // colour-blind friendly: every colour has its own pattern and its name on the wire
      if (o.labels !== false) w.append(el('span', 'wire-label', g.t['n_' + color]));
      w.onclick = () => {
        if (g.ended || w.classList.contains('cut')) return;
        const r = M.cutWire(puzzle, done, i);
        w.classList.add('cut');
        w.append(el('div', 'gap'));
        if (r === 'wrong') { w.classList.add('wrong'); return finish(false); }
        items[done].className = 'done';
        done += 1;
        if (r === 'done') return finish(true);
        sound('good');
        items[done].className = 'current';
      };
      wireBox.append(w);
    });
    wrap.append(wireBox, clues);
    $('mg-body').append(wrap);
    $('mg-hint').textContent = g.t.wires_hint;
    startTimer(o.time || 20);
  };

  // LOCKPICK: stop the pick in each pin's sweet spot
  Games.lockpick = function (g) {
    const o = g.o;
    const zone = o.zone || 0.13;
    const pins = M.makePins(g.rand, o.pins || 4, zone);
    let current = 0;
    let lives = o.lives || 1;
    let started = performance.now();
    let pos = 0;
    const box = el('div', 'lock');
    const pinRow = el('div', 'pins');
    const pinEls = pins.map((_, i) => { const p = el('div', 'pin' + (i === 0 ? ' current' : '')); pinRow.append(p); return p; });
    const track = el('div', 'track');
    const zoneEl = el('div', 'zone');
    const pick = el('div', 'pick');
    const flash = el('div', 'flash');
    track.append(zoneEl, pick);
    box.append(pinRow, track, flash);
    $('mg-body').append(box);
    $('mg-hint').textContent = g.t.lockpick_hint;
    status(`${g.t.lives}: ${lives}`);

    const placeZone = () => {
      zoneEl.style.left = `${(pins[current] - zone / 2) * 100}%`;
      zoneEl.style.width = `${zone * 100}%`;
    };
    placeZone();
    const tryPin = () => {
      if (g.ended) return;
      if (M.inZone(pos, pins[current], zone)) {
        pinEls[current].className = 'pin set';
        current += 1;
        flash.textContent = '';
        if (current >= pins.length) return finish(true);
        pinEls[current].className = 'pin current';
        placeZone();
        started = performance.now();
        sound('good');
      } else {
        lives -= 1;
        status(`${g.t.lives}: ${lives}`);
        if (lives <= 0) return finish(false, g.t.pick_broke);
        sound('bad');
        flash.textContent = g.t.pick_broke;
      }
    };
    track.onclick = tryPin;
    g.onKey = (e) => { if (e.code === 'Space') { e.preventDefault(); tryPin(); } };
    g.frame = (now) => {
      pos = M.sweep((now - started) / 1000, o.speed || 1);
      pick.style.left = `${pos * 100}%`;
    };
    if (o.time) startTimer(o.time);
  };

  // FINGERPRINT: pick the 4 pieces of the print shown
  function drawPrint(canvas, seed, part) {
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    if (part !== undefined) {
      ctx.scale(2, 2);
      ctx.translate(-(part % 2) * size / 2, -Math.floor(part / 2) * size / 2);
    }
    ctx.strokeStyle = '#8fd3ff';
    ctx.lineWidth = part !== undefined ? 1.1 : 1.6;
    ctx.lineCap = 'round';
    for (const line of M.ridges(seed)) {
      ctx.beginPath();
      line.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x * size, p.y * size) : ctx.lineTo(p.x * size, p.y * size)));
      ctx.stroke();
    }
    ctx.restore();
  }

  Games.fingerprint = function (g) {
    const o = g.o;
    const print = M.makeFingerprint(g.rand, o.decoys || 6);
    let lives = o.lives || 1;
    let selected = [];
    const wrap = el('div', 'print');
    const side = el('div', 'print-side');
    const target = el('canvas');
    target.width = target.height = 220;
    drawPrint(target, print.seed);
    const check = el('button', '', g.t.check);
    const flash = el('div', 'flash');
    side.append(target, check, flash);
    const grid = el('div', 'pieces');
    const tiles = print.pieces.map((p, i) => {
      const c = el('canvas');
      c.width = c.height = 110;
      drawPrint(c, p.seed, p.part);
      c.onclick = () => {
        if (g.ended) return;
        if (selected.includes(i)) selected = selected.filter((s) => s !== i);
        else if (selected.length < 4) selected.push(i);
        else return;
        sound('click');
        tiles.forEach((t, j) => t.classList.toggle('selected', selected.includes(j)));
      };
      grid.append(c);
      return c;
    });
    check.onclick = () => {
      if (g.ended || selected.length !== 4) return;
      if (M.fingerprintCheck(print.pieces, selected)) return finish(true);
      lives -= 1;
      status(`${g.t.lives}: ${lives}`);
      if (lives <= 0) return finish(false, g.t.no_match);
      sound('bad');
      flash.textContent = g.t.no_match;
      selected = [];
      tiles.forEach((t) => t.classList.remove('selected'));
    };
    wrap.append(side, grid);
    $('mg-body').append(wrap);
    $('mg-hint').textContent = g.t.fingerprint_hint;
    status(`${g.t.lives}: ${lives}`);
    startTimer(o.time || 25);
  };

  // A CSS variable's current colour (the theme), for drawing on canvases
  const cssColor = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const DARK_INK = ['black', 'blue', 'purple', 'green', 'red'];

  // HOTWIRE: click a wire, then the terminal with its colour's name
  Games.hotwire = function (g) {
    const o = g.o;
    const puzzle = M.makeHotwire(g.rand, o.wires || 4, o.tricky);
    const connected = [], usedTerms = [];
    let mistakes = o.mistakes || 0;
    let picked = null;
    const box = el('div', 'hotwire');
    const left = el('div', 'hw-col'), right = el('div', 'hw-col');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'hw-lines');
    const flash = el('div', 'flash');
    const wireEls = puzzle.wires.map((color, i) => {
      const w = el('div', `wire hw-wire wire-${color}`);
      w.style.backgroundColor = WIRE_HEX[color];
      if (o.labels !== false) w.append(el('span', 'wire-label', g.t['n_' + color]));
      w.onclick = () => {
        if (g.ended || connected.includes(i)) return;
        picked = i;
        wireEls.forEach((e, j) => e.classList.toggle('picked', j === i));
        sound('click');
      };
      left.append(w);
      return w;
    });
    const link = (w, b, color) => {
      const r = box.getBoundingClientRect(), a = w.getBoundingClientRect(), c = b.getBoundingClientRect();
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', a.right - r.left); line.setAttribute('y1', a.top + a.height / 2 - r.top);
      line.setAttribute('x2', c.left - r.left); line.setAttribute('y2', c.top + c.height / 2 - r.top);
      line.setAttribute('stroke', WIRE_HEX[color]);
      svg.append(line);
    };
    puzzle.terminals.forEach((term, j) => {
      const b = el('div', 'hw-term', g.t['n_' + term.name].toUpperCase());
      b.style.color = WIRE_HEX[term.ink];
      b.classList.add(DARK_INK.includes(term.ink) ? 'ink-dark' : 'ink-light');
      b.onclick = () => {
        if (g.ended || picked === null || usedTerms.includes(j)) return;
        const r = M.connectWire(puzzle, connected, picked, j);
        if (r === 'used') return;
        if (r === 'wrong') {
          mistakes -= 1;
          status(`${g.t.mistakes}: ${Math.max(0, mistakes)}`);
          b.classList.remove('spark'); void b.offsetWidth; b.classList.add('spark');
          if (mistakes < 0) return finish(false, g.t.sparks);
          flash.textContent = g.t.sparks;
          return sound('bad');
        }
        connected.push(picked);
        usedTerms.push(j);
        wireEls[picked].classList.add('connected');
        wireEls[picked].classList.remove('picked');
        b.classList.add('connected');
        link(wireEls[picked], b, puzzle.wires[picked]);
        picked = null;
        flash.textContent = '';
        if (r === 'done') return finish(true);
        sound('good');
      };
      right.append(b);
    });
    box.append(left, svg, right);
    $('mg-body').append(el('div', 'hw-wrap'));
    $('mg-body').lastChild.append(box, flash);
    $('mg-hint').textContent = g.t.hotwire_hint;
    status(`${g.t.mistakes}: ${mistakes}`);
    startTimer(o.time || 16);
  };

  // LASER GRID: cross the room without touching a laser
  const MOVE_KEYS = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
  Games.lasers = function (g) {
    const o = g.o;
    const beams = M.makeLasers(g.rand, o.walls ?? 4, o.sweepers ?? 1, o.speed || 0.7, o.gap || 0.28);
    const W = 624, H = Math.round(W * M.ROOM_H), S = W; // S: pixels per room width
    const canvas = el('canvas', 'room');
    canvas.width = W; canvas.height = H;
    const flash = el('div', 'flash');
    const wrap = el('div', 'room-wrap');
    wrap.append(canvas, flash);
    $('mg-body').append(wrap);
    const ctx = canvas.getContext('2d');
    let p = { ...M.LASER_START }, lives = o.lives || 1, safeUntil = 0;
    const keys = {};
    const t0 = performance.now();
    let last = t0;
    g.onKey = (e) => { if (MOVE_KEYS[e.code]) { keys[MOVE_KEYS[e.code]] = true; e.preventDefault(); } };
    g.onKeyUp = (e) => { if (MOVE_KEYS[e.code]) keys[MOVE_KEYS[e.code]] = false; };
    const laser = cssColor('--bad') || '#ff4d5e';
    const draw = (t) => {
      ctx.fillStyle = '#10131a';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(0, 0, 0.08 * S, H);
      ctx.fillStyle = cssColor('--good') || '#3ecf8e';
      ctx.globalAlpha = 0.25;
      ctx.fillRect(0.95 * S, 0, W - 0.95 * S, H);
      ctx.globalAlpha = 1;
      for (const b of beams) {
        const on = M.beamOn(b, t);
        const pos = M.beamPos(b, t) * S;
        ctx.strokeStyle = laser;
        ctx.lineWidth = on ? 3 : 1;
        ctx.globalAlpha = on ? 1 : 0.25;
        ctx.shadowColor = laser;
        ctx.shadowBlur = on ? 12 : 0;
        ctx.beginPath();
        if (b.axis === 'v') {
          const x = b.x * S, half = (b.gap / 2) * S;
          ctx.moveTo(x, 0); ctx.lineTo(x, pos - half);
          ctx.moveTo(x, pos + half); ctx.lineTo(x, H);
        } else {
          ctx.moveTo(b.from * S, pos); ctx.lineTo(b.to * S, pos);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
      const blinking = performance.now() < safeUntil && Math.floor(performance.now() / 120) % 2 === 0;
      if (!blinking) {
        ctx.fillStyle = cssColor('--text') || '#fff';
        ctx.beginPath(); ctx.arc(p.x * S, p.y * S, M.PLAYER_R * S, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = cssColor('--brand') || '#ff6b2c';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };
    g.frame = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      const t = (now - t0) / 1000;
      p = M.moveDot(p, keys, dt, o.move || 0.35);
      if (now > safeUntil && M.laserHit(p, beams, t)) {
        lives -= 1;
        status(`${g.t.lives}: ${Math.max(0, lives)}`);
        if (lives <= 0) { draw(t); return finish(false, g.t.laser_hit); }
        sound('bad');
        flash.textContent = g.t.laser_hit;
        p = { ...M.LASER_START };
        safeUntil = now + 1000;
      }
      if (M.laserExit(p)) { draw(t); return finish(true); }
      draw(t);
    };
    $('mg-hint').textContent = g.t.lasers_hint;
    status(`${g.t.lives}: ${lives}`);
    draw(0);
    startTimer(o.time || 35);
  };

  // KEY FILING: file each cut down to its line, not deeper
  Games.keyfiling = function (g) {
    const o = g.o;
    const tol = o.tolerance || 0.045;
    const targets = M.makeKeyCuts(g.rand, o.cuts || 5);
    let depths = targets.map(() => 0);
    let sel = 0, filing = false, lives = o.lives || 1, lastRasp = 0;
    let last = performance.now();
    const box = el('div', 'key');
    box.append(el('div', 'key-bow'));
    const blade = el('div', 'key-blade');
    const cuts = targets.map((target, i) => {
      const c = el('div', 'cut');
      const band = el('div', 'band');
      band.style.bottom = `${(1 - target - tol) * 100}%`;
      band.style.height = `${tol * 2 * 100}%`;
      const metal = el('div', 'metal');
      const line = el('div', 'line');
      line.style.bottom = `${(1 - target) * 100}%`;
      c.append(metal, band, line);
      c.onmousedown = (e) => { if (g.ended) return; sel = i; filing = true; e.preventDefault(); };
      blade.append(c);
      return { c, metal };
    });
    box.append(blade);
    const flash = el('div', 'flash');
    $('mg-body').append(el('div', 'key-wrap'));
    $('mg-body').lastChild.append(box, flash);
    const show = () => cuts.forEach((k, i) => {
      k.metal.style.height = `${(1 - depths[i]) * 100}%`;
      k.c.classList.toggle('selected', i === sel);
      k.c.classList.toggle('ok', M.cutOk(depths[i], targets[i], tol));
    });
    const stopFiling = () => { filing = false; };
    document.addEventListener('mouseup', stopFiling);
    g.onKey = (e) => {
      if (e.code === 'Space') { filing = true; e.preventDefault(); }
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') { sel = Math.max(0, sel - 1); sound('click'); }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') { sel = Math.min(targets.length - 1, sel + 1); sound('click'); }
      show();
    };
    g.onKeyUp = (e) => { if (e.code === 'Space') filing = false; };
    g.frame = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      if (filing) {
        depths[sel] = M.fileCut(depths[sel], dt, o.speed || 0.4);
        if (now - lastRasp > 160) { sound('move'); lastRasp = now; }
        if (M.cutRuined(depths[sel], targets[sel], tol)) {
          filing = false;
          lives -= 1;
          status(`${g.t.lives}: ${Math.max(0, lives)}`);
          if (lives <= 0) { show(); return finish(false, g.t.key_ruined); }
          sound('bad');
          flash.textContent = g.t.key_ruined;
          depths = targets.map(() => 0);
        }
      }
      show();
      if (M.keyDone(depths, targets, tol)) { document.removeEventListener('mouseup', stopFiling); finish(true); }
    };
    $('mg-hint').textContent = g.t.keyfiling_hint;
    status(`${g.t.lives}: ${lives}`);
    show();
    startTimer(o.time || 40);
  };

  // TRACKER SWEEP: follow the signal, click where the tracker is
  Games.tracker = function (g) {
    const o = g.o;
    const puzzle = M.makeTracker(g.rand, o.decoys || 0);
    const W = 624, H = Math.round(W * M.ROOM_H), S = W;
    const canvas = el('canvas', 'car');
    canvas.width = W; canvas.height = H;
    const meter = el('div', 'meter');
    const fill = el('div', 'meter-fill');
    const label = el('span', 'meter-label', `${g.t.signal}: 0%`);
    meter.append(fill, label);
    const flash = el('div', 'flash');
    const wrap = el('div', 'room-wrap');
    wrap.append(canvas, meter, flash);
    $('mg-body').append(wrap);
    const ctx = canvas.getContext('2d');
    let lives = o.lives || 1, scan = null, lastBeep = 0;
    const misses = [];
    let found = null;
    const round = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); };
    const draw = (now) => {
      ctx.fillStyle = '#10131a'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#1b1f28';
      for (const [x, y] of [[0.2, 0.1], [0.72, 0.1], [0.2, 0.78], [0.72, 0.78]]) { round(x * S, y * H, 0.09 * S, 0.12 * H, 6); ctx.fill(); }
      ctx.fillStyle = '#2b313d'; ctx.strokeStyle = '#4a5160'; ctx.lineWidth = 2;
      round(0.1 * S, 0.14 * H, 0.8 * S, 0.72 * H, 40); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1e2330';
      round(0.3 * S, 0.22 * H, 0.1 * S, 0.56 * H, 10); ctx.fill();
      round(0.62 * S, 0.24 * H, 0.08 * S, 0.52 * H, 10); ctx.fill();
      for (const m of misses) {
        ctx.strokeStyle = cssColor('--bad'); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(m.x * S - 7, m.y * S - 7); ctx.lineTo(m.x * S + 7, m.y * S + 7);
        ctx.moveTo(m.x * S + 7, m.y * S - 7); ctx.lineTo(m.x * S - 7, m.y * S + 7); ctx.stroke();
      }
      if (found) {
        ctx.fillStyle = cssColor('--good');
        ctx.beginPath(); ctx.arc(found.x * S, found.y * S, 9, 0, Math.PI * 2); ctx.fill();
      }
      if (scan) {
        const s = M.signal(scan, puzzle);
        const pulse = Math.max(0, 1 - (now - lastBeep) / 300);
        ctx.strokeStyle = cssColor('--brand'); ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5 + 0.5 * pulse;
        ctx.beginPath(); ctx.arc(scan.x * S, scan.y * S, 18 + pulse * 10, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
        fill.style.width = `${Math.round(s * 100)}%`;
        label.textContent = `${g.t.signal}: ${Math.round(s * 100)}%`;
      }
    };
    canvas.onmousemove = (e) => {
      const r = canvas.getBoundingClientRect();
      scan = { x: (e.clientX - r.left) / r.width, y: ((e.clientY - r.top) / r.height) * M.ROOM_H };
    };
    canvas.onmouseleave = () => { scan = null; };
    canvas.onclick = () => {
      if (g.ended || !scan) return;
      if (M.trackerFound(scan, puzzle, o.radius || 0.055)) { found = puzzle.tracker; draw(performance.now()); return finish(true); }
      misses.push({ ...scan });
      lives -= 1;
      status(`${g.t.lives}: ${Math.max(0, lives)}`);
      if (lives <= 0) { found = puzzle.tracker; draw(performance.now()); return finish(false, g.t.nothing_here); }
      sound('bad');
      flash.textContent = g.t.nothing_here;
    };
    g.frame = (now) => {
      if (scan) {
        const s = M.signal(scan, puzzle);
        if (s > 0.02 && now - lastBeep > 900 - 780 * s) { sound('move'); lastBeep = now; }
      }
      draw(now);
    };
    $('mg-hint').textContent = g.t.tracker_hint;
    status(`${g.t.lives}: ${lives}`);
    draw(performance.now());
    startTimer(o.time || 35);
  };

  window.addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.action === 'open' && Games[d.game]) open(d);
    else if (d.action === 'close') close();
  });

  document.addEventListener('keyup', (e) => { if (game && game.onKeyUp) game.onKeyUp(e); });

  document.addEventListener('keydown', (e) => {
    if (!game || game.ended) return;
    if (e.key === 'Escape') return finish(false);
    if (game.onKey) game.onKey(e);
  });
})();
