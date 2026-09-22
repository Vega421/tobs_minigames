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

  window.addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.action === 'open' && Games[d.game]) open(d);
    else if (d.action === 'close') close();
  });

  document.addEventListener('keydown', (e) => {
    if (!game || game.ended) return;
    if (e.key === 'Escape') return finish(false);
    if (game.onKey) game.onKey(e);
  });
})();
