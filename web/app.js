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

  // Text with keys: "[SPACE]" and "[W]" are drawn as keycaps
  function setText(node, text) {
    node.textContent = '';
    String(text || '').split(/(\[[^\]]{1,12}\])/).forEach((part) => {
      if (/^\[.+\]$/.test(part)) node.append(el('kbd', '', part.slice(1, -1)));
      else if (part) node.append(document.createTextNode(part));
    });
  }

  // Lives, mistakes or attempts as dots: filled for what's left. The first call sets the total.
  function counter(label, left) {
    if (game.counterMax == null) game.counterMax = left;
    const box = $('mg-status');
    box.textContent = '';
    box.title = `${label}: ${Math.max(0, left)}`;
    box.append(el('span', 'counter-label', label));
    if (game.counterMax <= 0) { box.append(el('span', 'dot lost')); return; }
    for (let i = 0; i < game.counterMax; i++) box.append(el('span', i < left ? 'dot' : 'dot lost'));
  }

  // A short effect on the panel: "shake" for a mistake, "pulse" for a right step
  function effect(name) {
    const panel = document.querySelector('#mg .panel');
    panel.classList.remove('fx-shake', 'fx-pulse');
    void panel.offsetWidth; // restart the animation
    panel.classList.add(`fx-${name}`);
  }

  // A GTA sound through the game: "click", "move", "good", "bad", "success" or "fail"
  function sound(name) {
    post('sound', { name });
    if (name === 'bad') effect('shake');
    else if (name === 'good') effect('pulse');
  }

  // A countdown bar; the game fails when it runs out (fails = false: it only shows the time)
  function startTimer(seconds, fails = true) {
    game.timerEnd = performance.now() + seconds * 1000;
    game.timerLength = seconds * 1000;
    game.timerFails = fails;
    game.lastTick = null;
  }
  function stopTimer() {
    game.timerEnd = null;
    $('mg-timer').style.transform = 'scaleX(1)';
    $('mg-time').textContent = '';
    document.querySelector('#mg .panel').classList.remove('low-time');
  }

  function loop(now) {
    if (!game || game.ended) return;
    if (game.timerEnd) {
      const left = game.timerEnd - now;
      $('mg-timer').style.transform = `scaleX(${Math.max(0, left / game.timerLength)})`;
      if (game.timerFails) {
        // the seconds, and a warning (red, pulsing, a tick a second) for the last few
        const secs = Math.max(0, Math.min(Math.round(game.timerLength / 1000), Math.ceil(left / 1000)));
        $('mg-time').textContent = `${secs} s`;
        const low = left <= Math.min(5000, game.timerLength * 0.3);
        document.querySelector('#mg .panel').classList.toggle('low-time', low);
        if (low && secs > 0 && secs !== game.lastTick) { game.lastTick = secs; post('sound', { name: 'move' }); }
      }
      if (left <= 0 && game.timerFails) { finish(false, game.t.time_up); return; }
      if (left <= 0) game.timerEnd = null;
    }
    if (game.frame) game.frame(now);
    requestAnimationFrame(loop);
  }

  // ESC: failed, and the test menu's "Play all" stops
  function giveUp() {
    if (!game || game.ended) return;
    game.gaveUp = true;
    finish(false);
  }

  // The end: "Success · 12.4 s" or "Failed · the reason"
  function finish(success, reason) {
    if (!game || game.ended) return;
    game.ended = true;
    const took = game.startedAt ? ((performance.now() - game.startedAt) / 1000).toFixed(1) : null;
    $('mg-result-title').textContent = success ? game.t.success : game.t.failed;
    const sub = [];
    if (reason) sub.push(reason);
    if (took && success) sub.push(fmt(game.t.took, took));
    $('mg-result-sub').textContent = sub.join(' · ');
    $('mg-result').className = success ? 'good' : 'bad';
    document.querySelector('#mg .panel').classList.remove('low-time');
    sound(success ? 'success' : 'fail');
    const gaveUp = game.gaveUp === true;
    setTimeout(() => post('done', { success, gaveUp }), 1200);
  }

  // MG.Style from config.lua: a class on the page that style.css turns into a look
  const STYLES = ['default', 'terminal', 'glass'];
  function applyStyle(style) {
    document.documentElement.className = `style-${STYLES.includes(style) ? style : 'default'}`;
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

  // MG.Scale: the same share of the screen on any resolution (made for 1080p), never bigger than
  // fits. In the preview (ui.fit) it just fills the frame.
  let ui = {};
  function applyScale(panel = document.querySelector('#mg .panel')) {
    panel.style.transform = 'none';
    const fit = Math.min((innerWidth - 32) / panel.offsetWidth, (innerHeight - 32) / panel.offsetHeight);
    const wanted = ui.fit ? 1.15 : (Number(ui.scale) || 1) * (innerHeight / 1080);
    panel.style.transform = `scale(${Math.max(0.3, Math.min(wanted, fit))})`;
  }
  window.addEventListener('resize', () => {
    if (game) applyScale();
    if (menuOpen) applyScale($('mg-menu-panel'));
  });
  // How much the panel is scaled on screen (for positions measured with getBoundingClientRect)
  const panelScale = (node) => node.getBoundingClientRect().width / node.offsetWidth || 1;

  function applyUi(u) {
    ui = u || {};
    const root = document.documentElement;
    root.style.setProperty('--text-scale', String(Number(ui.textSize) || 1));
    root.classList.toggle('reduced-motion', ui.reducedMotion === true);
  }

  function startGame() {
    if (!game || game.started || game.ended) return;
    game.started = true;
    clearInterval(game.introTimer);
    $('mg-intro').classList.add('hidden');
    document.querySelector('#mg .panel').classList.remove('intro');
    game.startedAt = performance.now();
    Games[game.name](game);
    applyScale();
  }

  function open(data) {
    const t = data.text;
    applyStyle(data.style);
    applyTheme(data.theme);
    applyUi(data.ui);
    game = { name: data.game, o: data.opts || {}, t, ended: false, rand: M.random(data.opts && data.opts.seed) };
    const panel = document.querySelector('#mg .panel');
    panel.className = `panel game-${data.game}`;
    $('mg-title').textContent = t['title_' + data.game] || data.game;
    setText($('mg-hint'), '');
    setText($('mg-giveup'), t.give_up);
    $('mg-result').className = 'hidden';
    $('mg-body').innerHTML = '';
    status('');
    stopTimer();
    $('mg').classList.remove('hidden', 'leaving');
    // The "how to play" card; the game (and its timer) starts on SPACE, a click, or by itself
    const intro = Number(ui.intro) || 0;
    if (intro > 0 && t['howto_' + data.game]) {
      $('mg-intro-title').textContent = t['title_' + data.game] || data.game;
      setText($('mg-intro-howto'), t['howto_' + data.game]);
      setText($('mg-intro-start'), t.start);
      let left = Math.ceil(intro);
      $('mg-intro-count').textContent = fmt(t.starts_in, left);
      $('mg-intro').classList.remove('hidden');
      panel.classList.add('intro');
      game.introTimer = setInterval(() => {
        left -= 1;
        if (left <= 0) return startGame();
        $('mg-intro-count').textContent = fmt(t.starts_in, left);
      }, 1000);
      applyScale();
    } else {
      $('mg-intro').classList.add('hidden');
      startGame();
    }
    requestAnimationFrame(loop);
  }
  $('mg-intro').addEventListener('click', startGame);

  function close() {
    if (game) clearInterval(game.introTimer);
    game = null;
    $('mg').classList.add('leaving');
    setTimeout(() => {
      if (game) return; // a new game opened meanwhile
      $('mg').classList.add('hidden');
      $('mg').classList.remove('leaving');
      $('mg-body').innerHTML = '';
    }, 180);
  }

  const Games = {};

  // KEYPAD: remember the code, then type it
  Games.keypad = function (g) {
    const o = g.o;
    // o.code: a code the player already knows (e.g. from a note); with show = 0 it isn't shown first
    const code = o.code != null && /^[0-9]{1,12}$/.test(String(o.code)) ? String(o.code) : M.keypadCode(g.rand, o.length || 5);
    const showMs = o.show == null ? 2500 : Number(o.show);
    let attempts = o.attempts || 1;
    let input = '';
    let entering = false;
    const box = el('div', 'keypad');
    const shown = el('div', 'code', showMs > 0 ? code : '');
    const flash = el('div', 'flash');
    const keys = el('div', 'keys');
    box.append(shown, flash, keys);
    $('mg-body').append(box);
    setText($('mg-hint'), g.t.keypad_memorize);

    const showInput = () => { shown.textContent = input.padEnd(code.length, '•'); };
    const press = (k) => {
      if (!entering || g.ended) return;
      if (k !== 'enter') sound('click');
      if (k === 'clear') input = '';
      else if (k === 'back') input = input.slice(0, -1);
      else if (k === 'enter') {
        if (M.keypadCheck(code, input)) return finish(true);
        attempts -= 1;
        counter(g.t.attempts, attempts);
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
    if (showMs > 0) startTimer(showMs / 1000, false);
    g.onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('back');
      else if (e.key === 'Enter') press('enter');
    };
    const enter = () => {
      if (g.ended || game !== g) return;
      entering = true;
      shown.classList.add('hidden-code');
      keys.style.visibility = 'visible';
      setText($('mg-hint'), g.t.keypad_enter);
      counter(g.t.attempts, attempts);
      showInput();
      startTimer(o.time || 15);
    };
    if (showMs > 0) setTimeout(enter, showMs); else enter();
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
          counter(g.t.mistakes, Math.max(0, mistakes));
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
    setText($('mg-hint'), g.t.thermite_memorize);
    startTimer((o.show || 2500) / 1000, false);
    setTimeout(() => {
      if (g.ended || game !== g) return;
      clicking = true;
      cells.forEach((c) => c.classList.remove('lit'));
      setText($('mg-hint'), g.t.thermite_click);
      counter(g.t.mistakes, mistakes);
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
    setText($('mg-hint'), g.t.wires_hint);
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
    setText($('mg-hint'), g.t.lockpick_hint);
    counter(g.t.lives, lives);

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
        counter(g.t.lives, lives);
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
      counter(g.t.lives, lives);
      if (lives <= 0) return finish(false, g.t.no_match);
      sound('bad');
      flash.textContent = g.t.no_match;
      selected = [];
      tiles.forEach((t) => t.classList.remove('selected'));
    };
    wrap.append(side, grid);
    $('mg-body').append(wrap);
    setText($('mg-hint'), g.t.fingerprint_hint);
    counter(g.t.lives, lives);
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
      const k = panelScale(box);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', (a.right - r.left) / k); line.setAttribute('y1', (a.top + a.height / 2 - r.top) / k);
      line.setAttribute('x2', (c.left - r.left) / k); line.setAttribute('y2', (c.top + c.height / 2 - r.top) / k);
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
          counter(g.t.mistakes, Math.max(0, mistakes));
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
    setText($('mg-hint'), g.t.hotwire_hint);
    counter(g.t.mistakes, mistakes);
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
    const sparks = []; // {x, y, vx, vy, life} in pixels, from touching a laser
    const keys = {};
    const t0 = performance.now();
    let last = t0;
    g.onKey = (e) => { if (MOVE_KEYS[e.code]) { keys[MOVE_KEYS[e.code]] = true; e.preventDefault(); } };
    g.onKeyUp = (e) => { if (MOVE_KEYS[e.code]) keys[MOVE_KEYS[e.code]] = false; };
    const laser = cssColor('--bad') || '#ff4d5e';
    const draw = (t) => {
      ctx.fillStyle = cssColor('--floor');
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = cssColor('--floor-line');
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.fillStyle = cssColor('--floor-line');
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
      for (const s of sparks) {
        ctx.strokeStyle = s.life > 0.25 ? '#fff6c2' : laser;
        ctx.globalAlpha = Math.min(1, s.life * 2.5);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.03, s.y - s.vy * 0.03); ctx.stroke();
      }
      ctx.globalAlpha = 1;
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
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 500 * dt; s.life -= dt;
        if (s.life <= 0) sparks.splice(i, 1);
      }
      if (now > safeUntil && M.laserHit(p, beams, t)) {
        for (let k = 0; k < 16; k++) {
          const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 260;
          sparks.push({ x: p.x * S, y: p.y * S, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0.35 + Math.random() * 0.3 });
        }
        lives -= 1;
        counter(g.t.lives, Math.max(0, lives));
        if (lives <= 0) { draw(t); return finish(false, g.t.laser_hit); }
        sound('bad');
        flash.textContent = g.t.laser_hit;
        p = { ...M.LASER_START };
        safeUntil = now + 1000;
      }
      if (M.laserExit(p)) { draw(t); return finish(true); }
      draw(t);
    };
    setText($('mg-hint'), g.t.lasers_hint);
    counter(g.t.lives, lives);
    draw(0);
    startTimer(o.time || 35);
  };

  // KEY FILING: file each cut down to its line, not deeper. The key is drawn as SVG: a bow, and a
  // blade whose notches follow each cut's depth.
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs) => {
    const e = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    return e;
  };
  Games.keyfiling = function (g) {
    const o = g.o;
    const tol = o.tolerance || 0.045;
    const targets = M.makeKeyCuts(g.rand, o.cuts || 5);
    const n = targets.length;
    let depths = targets.map(() => 0);
    let sel = 0, filing = false, lives = o.lives || 1, lastRasp = 0, lastFiling = 0;
    let last = performance.now();
    // Geometry (SVG units): blade from x0, each cut cw wide, top y0, bottom y1
    const cw = Math.min(64, 330 / n), x0 = 150, y0 = 56, y1 = 150, reach = (y1 - y0) * 0.85;
    const xEnd = x0 + n * cw + 10, W = xEnd + 40;
    const depthY = (d) => y0 + d * reach;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} 200`, class: 'key-svg' });
    // the bow: a ring with a hole, and the shoulder
    svg.append(svgEl('circle', { cx: 70, cy: 103, r: 58, class: 'key-metal' }));
    svg.append(svgEl('circle', { cx: 60, cy: 103, r: 18, class: 'key-hole' }));
    svg.append(svgEl('rect', { x: 118, y: 72, width: 40, height: 62, rx: 6, class: 'key-metal' }));
    const blade = svgEl('path', { class: 'key-metal' });
    svg.append(blade);
    svg.append(svgEl('line', { x1: x0, y1: 128, x2: xEnd, y2: 128, class: 'key-groove' }));
    const cols = targets.map((target, i) => {
      const x = x0 + i * cw;
      const hi = svgEl('rect', { x: x + 2, y: 30, width: cw - 4, height: 126, rx: 6, class: 'cut-select' });
      const band = svgEl('rect', { x: x + cw * 0.12, y: depthY(target - tol), width: cw * 0.76, height: 2 * tol * reach, class: 'cut-band' });
      const line = svgEl('line', { x1: x + cw * 0.08, x2: x + cw * 0.92, y1: depthY(target), y2: depthY(target), class: 'cut-line' });
      const ok = svgEl('circle', { cx: x + cw / 2, cy: 38, r: 5, class: 'cut-ok' });
      const hit = svgEl('rect', { x, y: 20, width: cw, height: 150, class: 'cut-hit' });
      hit.addEventListener('mousedown', (e) => { if (g.ended) return; sel = i; filing = true; e.preventDefault(); });
      svg.insertBefore(hi, blade);
      svg.append(band, line, ok, hit);
      return { hi, ok };
    });
    const filings = svgEl('g');
    svg.append(filings);
    const box = el('div', 'key-wrap');
    const flash = el('div', 'flash');
    box.append(svg, flash);
    $('mg-body').append(box);

    const draw = () => {
      // the blade's top edge dips into a notch at each cut, then a pointed tip
      let d = `M ${x0} ${y0}`;
      depths.forEach((dep, i) => {
        const x = x0 + i * cw, y = depthY(dep);
        d += ` L ${x + cw * 0.14} ${y0} L ${x + cw * 0.26} ${y} L ${x + cw * 0.74} ${y} L ${x + cw * 0.86} ${y0}`;
      });
      d += ` L ${xEnd} ${y0} L ${xEnd + 28} ${(y0 + y1) / 2 + 12} L ${xEnd} ${y1} L ${x0} ${y1} Z`;
      blade.setAttribute('d', d);
      cols.forEach((c, i) => {
        c.hi.classList.toggle('on', i === sel);
        c.ok.classList.toggle('on', M.cutOk(depths[i], targets[i], tol));
      });
    };
    const spark = () => {
      const x = x0 + sel * cw + cw * (0.3 + Math.random() * 0.4), y = depthY(depths[sel]);
      const bit = svgEl('circle', { cx: x, cy: y, r: 1.4 + Math.random() * 1.2, class: 'filing' });
      bit.style.setProperty('--dx', `${(Math.random() - 0.5) * 24}px`);
      filings.append(bit);
      setTimeout(() => bit.remove(), 650);
    };
    const stopFiling = () => { filing = false; };
    document.addEventListener('mouseup', stopFiling);
    g.onKey = (e) => {
      if (e.code === 'Space') { filing = true; e.preventDefault(); }
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') { sel = Math.max(0, sel - 1); sound('click'); }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') { sel = Math.min(n - 1, sel + 1); sound('click'); }
      draw();
    };
    g.onKeyUp = (e) => { if (e.code === 'Space') filing = false; };
    g.frame = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      if (filing) {
        depths[sel] = M.fileCut(depths[sel], dt, o.speed || 0.4);
        if (now - lastRasp > 160) { post('sound', { name: 'move' }); lastRasp = now; }
        if (now - lastFiling > 55) { spark(); lastFiling = now; }
        if (M.cutRuined(depths[sel], targets[sel], tol)) {
          filing = false;
          lives -= 1;
          counter(g.t.lives, Math.max(0, lives));
          if (lives <= 0) { draw(); document.removeEventListener('mouseup', stopFiling); return finish(false, g.t.key_ruined); }
          sound('bad');
          flash.textContent = g.t.key_ruined;
          depths = targets.map(() => 0);
        }
      }
      draw();
      if (M.keyDone(depths, targets, tol)) { document.removeEventListener('mouseup', stopFiling); finish(true); }
    };
    setText($('mg-hint'), g.t.keyfiling_hint);
    counter(g.t.lives, lives);
    draw();
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
    // A car seen from above, front to the right: wheels, body, mirrors, windows, roof, hood and
    // door lines, headlights and taillights
    const drawCar = () => {
      const X = (v) => v * S, Y = (v) => v * H;
      const edge = cssColor('--car-edge');
      ctx.fillStyle = cssColor('--car-wheel');
      for (const [x, y] of [[0.19, 0.09], [0.7, 0.09], [0.19, 0.79], [0.7, 0.79]]) { round(X(x), Y(y), X(0.1), Y(0.12), 6); ctx.fill(); }
      ctx.fillStyle = cssColor('--car-body'); ctx.strokeStyle = edge; ctx.lineWidth = 2;
      for (const y of [0.1, 0.9]) { ctx.beginPath(); ctx.ellipse(X(0.61), Y(y), X(0.022), Y(0.035), 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); } // mirrors
      round(X(0.08), Y(0.14), X(0.84), Y(0.72), 46); ctx.fill(); ctx.stroke();
      ctx.fillStyle = cssColor('--car-glass');
      ctx.beginPath(); ctx.moveTo(X(0.555), Y(0.24)); ctx.lineTo(X(0.64), Y(0.2)); ctx.lineTo(X(0.64), Y(0.8)); ctx.lineTo(X(0.555), Y(0.76)); ctx.closePath(); ctx.fill(); // windscreen
      ctx.beginPath(); ctx.moveTo(X(0.27), Y(0.22)); ctx.lineTo(X(0.33), Y(0.25)); ctx.lineTo(X(0.33), Y(0.75)); ctx.lineTo(X(0.27), Y(0.78)); ctx.closePath(); ctx.fill(); // rear window
      ctx.strokeStyle = edge; ctx.globalAlpha = 0.45; ctx.lineWidth = 1.5;
      round(X(0.34), Y(0.26), X(0.21), Y(0.48), 10); ctx.stroke(); // roof
      ctx.beginPath(); ctx.moveTo(X(0.66), Y(0.3)); ctx.quadraticCurveTo(X(0.8), Y(0.35), X(0.9), Y(0.34)); ctx.moveTo(X(0.66), Y(0.7)); ctx.quadraticCurveTo(X(0.8), Y(0.65), X(0.9), Y(0.66)); ctx.stroke(); // hood
      ctx.beginPath(); ctx.moveTo(X(0.45), Y(0.15)); ctx.lineTo(X(0.45), Y(0.23)); ctx.moveTo(X(0.45), Y(0.77)); ctx.lineTo(X(0.45), Y(0.85)); ctx.stroke(); // doors
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffe9a8';
      for (const y of [0.2, 0.72]) { round(X(0.895), Y(y), X(0.018), Y(0.08), 3); ctx.fill(); } // headlights
      ctx.fillStyle = '#ff4057';
      for (const y of [0.2, 0.72]) { round(X(0.087), Y(y), X(0.014), Y(0.08), 3); ctx.fill(); } // taillights
    };
    const draw = (now) => {
      ctx.fillStyle = cssColor('--floor'); ctx.fillRect(0, 0, W, H);
      drawCar();
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
        const cx = scan.x * S, cy = scan.y * S, R = 42;
        const brand = cssColor('--brand');
        // radar: a sweeping wedge that fades behind the line, turning faster on a strong signal
        const angle = (now / 1000) * (2 + s * 5);
        for (let k = 0; k < 14; k++) {
          ctx.globalAlpha = 0.28 * (1 - k / 14);
          ctx.fillStyle = brand;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, angle - (k + 1) * 0.07, angle - k * 0.07); ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 0.35; ctx.strokeStyle = brand; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, R / 2, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.5 + 0.5 * pulse; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, 8 + pulse * 10, 0, Math.PI * 2); ctx.stroke();
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
      counter(g.t.lives, Math.max(0, lives));
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
    setText($('mg-hint'), g.t.tracker_hint);
    counter(g.t.lives, lives);
    draw(performance.now());
    startTimer(o.time || 35);
  };

  // TEST MENU (/minigame): every game with its last result, difficulty and look for the test,
  // play one or all, and the tracker-on-a-vehicle test. client/testmenu.lua does the work.
  let menuOpen = false, menuState = null;
  function openMenu(d) {
    applyStyle(d.style);
    applyTheme(d.theme);
    applyUi(d.ui);
    menuOpen = true;
    menuState = { difficulty: d.difficulty, style: d.style };
    const t = d.text;
    let root = $('mg-menu');
    if (!root) { root = el('div'); root.id = 'mg-menu'; document.body.append(root); }
    root.innerHTML = '';
    root.className = '';
    const panel = el('div', 'panel menu-panel');
    panel.id = 'mg-menu-panel';
    const head = el('header');
    head.append(el('h1', '', t.menu_title));
    const x = el('button', 'menu-close', t.close);
    x.onclick = () => post('menuClose', {});
    head.append(x);
    panel.append(head, el('p', 'menu-hint', t.menu_hint));

    // difficulty and look
    const row = (label, values, current, key, names) => {
      const r = el('div', 'menu-row');
      r.append(el('span', 'menu-label', label));
      const seg = el('div', 'seg');
      values.forEach((v) => {
        const b = el('button', v === current ? 'on' : '', names ? names(v) : v);
        b.onclick = () => {
          menuState[key] = v;
          seg.querySelectorAll('button').forEach((o) => o.classList.toggle('on', o === b));
          if (key === 'style') applyStyle(v);
          post('menuSettings', menuState);
          post('sound', { name: 'click' });
        };
        seg.append(b);
      });
      r.append(seg);
      return r;
    };
    panel.append(row(t.difficulty, ['easy', 'medium', 'hard'], d.difficulty, 'difficulty'));
    panel.append(row(t.look, d.styles || ['default', 'terminal', 'glass'], d.style, 'style'));

    // one card per game
    const grid = el('div', 'menu-grid');
    for (const g of d.games || []) {
      const card = el('button', 'menu-card');
      const name = el('span', 'menu-name', t['title_' + g.name] || g.name);
      if (g.gta) name.append(el('span', 'badge', 'GTA'));
      let res;
      if (!g.played) res = el('span', 'menu-res', t.not_played);
      else if (g.result === true) res = el('span', 'menu-res good', `✓ ${t.passed} · ${fmt(t.took, (g.ms / 1000).toFixed(1))} · ${g.difficulty}`);
      else if (g.result === false) res = el('span', 'menu-res bad', `✗ ${t.failed} · ${g.difficulty}`);
      else res = el('span', 'menu-res muted', `– ${t.no_screen}`);
      card.append(name, res);
      card.onclick = () => post('menuPlay', { game: g.name, difficulty: menuState.difficulty, style: menuState.style });
      grid.append(card);
    }
    panel.append(grid);

    const all = el('button', 'menu-all', t.play_all);
    all.onclick = () => post('menuAll', menuState);
    panel.append(all);

    // trackers on vehicles
    const tr = el('div', 'menu-tracker');
    tr.append(el('span', 'menu-label', t.tracker_test));
    const place = el('button', '', t.tracker_place);
    place.onclick = () => post('menuTracker', { action: 'place' });
    const sweep = el('button', '', t.tracker_sweep);
    sweep.onclick = () => post('menuTracker', { action: 'sweep' });
    tr.append(place, sweep);
    panel.append(tr);

    const foot = el('footer');
    const esc = el('span');
    setText(esc, t.give_up.replace(/\s.*$/, '') + ' ' + t.close);
    foot.append(esc);
    panel.append(foot);
    root.append(panel);
    applyScale(panel);
  }
  function closeMenu() {
    menuOpen = false;
    const root = $('mg-menu');
    if (root) root.className = 'hidden';
  }

  window.addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.action === 'open' && Games[d.game]) { closeMenu(); open(d); }
    else if (d.action === 'close') close();
    else if (d.action === 'menu') openMenu(d);
    else if (d.action === 'menu_close') closeMenu();
  });

  document.addEventListener('keyup', (e) => { if (game && game.onKeyUp) game.onKeyUp(e); });

  document.addEventListener('keydown', (e) => {
    if (menuOpen && !game && e.key === 'Escape') return post('menuClose', {});
    if (!game || game.ended) return;
    if (e.key === 'Escape') return giveUp();
    if (!game.started) {
      if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); startGame(); }
      return;
    }
    if (game.onKey) game.onKey(e);
  });
})();
