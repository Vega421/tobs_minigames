// Draws and runs the web minigames. client/main.lua opens one with {action: "open", game, opts, text}
// and gets the result back through the "done" callback. The rules are in logic.js.
//
// The look: each game is one object drawn in SVG (a keypad, a charge, a junction box, a lock, ...)
// with no window around it; under it a short instruction and the time; GTA's key bar at the bottom
// right. Shapes are painted by CSS classes (c-*), so MG.Style can repaint them.
(function () {
  'use strict';
  const M = window.MGLogic;
  const $ = (id) => document.getElementById(id);
  // Outside FiveM (dev/preview.html) there's no game: results and sounds go to the page around this one
  const IN_GAME = typeof GetParentResourceName === 'function';
  const RESOURCE = IN_GAME ? GetParentResourceName() : 'tobs_minigames';
  const WIRE_HEX = { red: '#c8312b', blue: '#2459c4', yellow: '#e8c832', green: '#2e8b4e', white: '#e9e9e6', black: '#1c1f26', orange: '#e0782b', purple: '#7d45b8' };
  const LIGHT_INK = ['white', 'yellow', 'orange'];

  let game = null; // the running game: {name, o, t, ended, frame, timerEnd, onKey}

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  const SVGNS = 'http://www.w3.org/2000/svg';
  // An SVG element; with a parent it's added to it
  function sv(tag, attrs, parent) {
    const e = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    if (parent) parent.append(e);
    return e;
  }
  function svText(parent, x, y, text, attrs) {
    const t = sv('text', Object.assign({ x, y }, attrs), parent);
    t.textContent = text;
    return t;
  }
  function svgBox(w, h, cls) {
    return sv('svg', { width: w, height: h, viewBox: `0 0 ${w} ${h}`, class: `thing ${cls || ''}` });
  }
  // A slotted screw head
  function screw(parent, x, y, turn) {
    sv('circle', { cx: x, cy: y, r: 6, class: 'c-screw' }, parent);
    sv('line', { x1: x - 4, y1: y, x2: x + 4, y2: y, class: 'c-slot', transform: `rotate(${turn || 30} ${x} ${y})` }, parent);
  }
  const fmt = (text, ...args) => { let i = 0; return text.replace(/%[sd]/g, () => String(args[i++])); };
  const cssColor = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function post(name, data) {
    if (!IN_GAME) { window.parent.postMessage({ preview: name, data }, '*'); return; }
    fetch(`https://${RESOURCE}/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(data),
    }).catch(() => {});
  }

  // Text with keys: "[SPACE]" and "[W]" are drawn as keycaps
  function setText(node, text) {
    node.textContent = '';
    String(text || '').split(/(\[[^\]]{1,12}\])/).forEach((part) => {
      if (/^\[.+\]$/.test(part)) node.append(el('kbd', '', part.slice(1, -1)));
      else if (part) node.append(document.createTextNode(part));
    });
  }

  // GTA's key bar at the bottom right: ESC to give up, then the game's own keys.
  // keys: [[key, label], ...]; the key "mouse" draws a mouse.
  function keyBar(keys) {
    const bar = $('mg-keys');
    bar.textContent = '';
    for (const [key, label] of [['ESC', game.t.key_giveup]].concat(keys || [])) {
      const item = el('span');
      const cap = el('kbd');
      if (key === 'mouse') {
        const m = sv('svg', { width: 12, height: 16, viewBox: '0 0 12 16' }, cap);
        sv('rect', { x: 1, y: 1, width: 10, height: 14, rx: 5, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5 }, m);
        sv('line', { x1: 6, y1: 3, x2: 6, y2: 6.5, stroke: 'currentColor', 'stroke-width': 1.5 }, m);
      } else cap.textContent = key;
      item.append(cap, document.createTextNode(label || ''));
      bar.append(item);
    }
  }

  // Lives, mistakes or attempts: "Attempts 2" under the object
  function counter(label, left) {
    $('mg-status').textContent = `${label} ${Math.max(0, left)}`;
  }
  function hint(text) { setText($('mg-hint'), text); }

  // A short effect on the object: "shake" for a mistake, "pulse" for a right step
  function effect(name) {
    const body = $('mg-body');
    body.classList.remove('fx-shake', 'fx-pulse');
    void body.offsetWidth; // restart the animation
    body.classList.add(`fx-${name}`);
  }

  // A GTA sound through the game: "click", "move", "good", "bad", "success" or "fail"
  function sound(name) {
    post('sound', { name });
    if (name === 'bad') effect('shake');
    else if (name === 'good') effect('pulse');
  }

  // A countdown; the game fails when it runs out (fails = false: it only counts, nothing shows)
  function startTimer(seconds, fails = true) {
    game.timerEnd = performance.now() + seconds * 1000;
    game.timerLength = seconds * 1000;
    game.timerFails = fails;
    game.lastTick = null;
  }
  function stopTimer() {
    game.timerEnd = null;
    $('mg-time').textContent = '';
    document.querySelector('#mg .panel').classList.remove('low-time');
  }

  function loop(now) {
    if (!game || game.ended) return;
    if (game.timerEnd) {
      const left = game.timerEnd - now;
      if (game.timerFails) {
        // m:ss, and a warning (red, a tick a second) for the last few seconds
        const secs = Math.max(0, Math.min(Math.round(game.timerLength / 1000), Math.ceil(left / 1000)));
        $('mg-time').textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
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
    if (game.introOnly) return endIntro(false);
    game.gaveUp = true;
    finish(false);
  }

  // The end: "Success" / "Failed", with the time or the reason under it
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
  const THEME_VARS = { accent: ['--brand'], background: ['--bg'], text: ['--text'], muted: ['--muted'], good: ['--good'], bad: ['--bad'], gold: ['--gold'] };
  function applyTheme(theme) {
    const root = document.documentElement.style;
    for (const [key, cssVars] of Object.entries(THEME_VARS)) {
      for (const cssVar of cssVars) {
        if (theme && typeof theme[key] === 'string' && theme[key] !== '') root.setProperty(cssVar, theme[key]);
        else root.removeProperty(cssVar);
      }
    }
  }

  // MG.Scale: the same share of the screen on any resolution (made for 1080p), never bigger than
  // fits. In the preview (ui.fit) it just fills the frame. The key bar is scaled the same way.
  let ui = {};
  function applyScale(panel = document.querySelector('#mg .panel')) {
    panel.style.transform = 'none';
    const fit = Math.min((innerWidth - 32) / panel.offsetWidth, (innerHeight - 90) / panel.offsetHeight);
    const wanted = ui.fit ? 1.15 : (Number(ui.scale) || 1) * (innerHeight / 1080);
    const k = Math.max(0.3, Math.min(wanted, fit));
    panel.style.transform = `scale(${k})`;
    document.documentElement.style.setProperty('--ui', String(Math.max(0.5, wanted)));
  }
  window.addEventListener('resize', () => {
    if (game) applyScale();
    if (menuOpen) applyScale($('mg-menu-panel'));
  });

  function applyUi(u) {
    ui = u || {};
    const root = document.documentElement;
    root.style.setProperty('--text-scale', String(Number(ui.textSize) || 1));
    root.classList.toggle('reduced-motion', ui.reducedMotion === true);
  }

  function startGame() {
    if (!game || game.started || game.ended) return;
    if (game.introOnly) return endIntro(true);
    game.started = true;
    clearInterval(game.introTimer);
    $('mg-intro').classList.add('hidden');
    document.querySelector('#mg .panel').classList.remove('intro');
    game.startedAt = performance.now();
    Games[game.name](game);
    applyScale();
  }

  function reset(data, intro) {
    const t = data.text;
    applyStyle(data.style);
    applyTheme(data.theme);
    applyUi(data.ui);
    const panel = document.querySelector('#mg .panel');
    panel.className = `panel game-${data.game}${intro ? ' intro' : ''}`;
    hint('');
    $('mg-result').className = 'hidden';
    $('mg-body').innerHTML = '';
    $('mg-status').textContent = '';
    $('mg-intro-title').textContent = t['title_' + data.game] || data.game;
    setText($('mg-intro-howto'), t['howto_' + data.game] || '');
    setText($('mg-intro-start'), t.start);
    stopTimer();
    keyBar([]);
    return panel;
  }

  function open(data) {
    game = { name: data.game, o: data.opts || {}, t: data.text, ended: false, rand: M.random(data.opts && data.opts.seed) };
    const panel = reset(data, false);
    const t = data.text;
    $('mg').classList.remove('hidden', 'leaving');
    // The "how to play" card; the game (and its timer) starts on SPACE, a click, or by itself
    const intro = Number(ui.intro) || 0;
    if (intro > 0 && t['howto_' + data.game]) {
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

  // The card alone, before one of GTA's own screens (drill, hack, safe): the game itself isn't on this
  // page. SPACE, a click or the countdown answers "start"; ESC answers "gave up".
  function openIntro(data) {
    game = { name: data.game, o: {}, t: data.text, ended: false, introOnly: true };
    reset(data, true);
    let left = Math.max(1, Math.ceil(Number(data.ui && data.ui.intro) || 1));
    $('mg-intro-count').textContent = fmt(data.text.starts_in, left);
    $('mg-intro').classList.remove('hidden');
    $('mg').classList.remove('hidden', 'leaving');
    game.introTimer = setInterval(() => {
      left -= 1;
      if (left <= 0) return endIntro(true);
      $('mg-intro-count').textContent = fmt(data.text.starts_in, left);
    }, 1000);
    applyScale();
  }

  function endIntro(start) {
    if (!game || !game.introOnly || game.ended) return;
    game.ended = true;
    clearInterval(game.introTimer);
    post('introDone', { start });
    close();
  }

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

  // KEYPAD: a wall keypad with a display and two lights. Remember the code, then type it.
  Games.keypad = function (g) {
    const o = g.o;
    // o.code: a code the player already knows (e.g. from a note); with show = 0 it isn't shown first
    const code = o.code != null && /^[0-9]{1,12}$/.test(String(o.code)) ? String(o.code) : M.keypadCode(g.rand, o.length || 5);
    const showMs = o.show == null ? 2500 : Number(o.show);
    let attempts = o.attempts || 1;
    let input = '';
    let entering = false;

    const svg = svgBox(300, 470, 'keypad');
    sv('rect', { x: 0.5, y: 0.5, width: 299, height: 469, rx: 18, class: 'c-alu' }, svg);
    sv('rect', { x: 0.5, y: 0.5, width: 299, height: 469, rx: 18, class: 'c-brush' }, svg);
    sv('rect', { x: 28, y: 30, width: 244, height: 64, rx: 4, class: 'c-display' }, svg);
    const shown = svText(svg, 150, 74, '', { 'text-anchor': 'middle', class: 't-display', 'font-size': code.length > 7 ? 22 : 30, 'letter-spacing': code.length > 7 ? 5 : 10 });
    const red = sv('circle', { cx: 244, cy: 116, r: 4, class: 'c-led red' }, svg);
    const green = sv('circle', { cx: 258, cy: 116, r: 4, class: 'c-led green' }, svg);
    svText(svg, 30, 120, 'ACCESS CONTROL', { class: 't-print', 'font-size': 9, 'letter-spacing': 2.5 });
    const LETTERS = { 2: 'ABC', 3: 'DEF', 4: 'GHI', 5: 'JKL', 6: 'MNO', 7: 'PQRS', 8: 'TUV', 9: 'WXYZ' };
    const keyEls = {};
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'enter'].forEach((k, i) => {
      const x = 36 + (i % 3) * 80, y = 146 + Math.floor(i / 3) * 76;
      const grp = sv('g', { class: 'btn key' }, svg);
      sv('rect', { x, y: y + 3, width: 68, height: 62, rx: 10, class: 'c-key-side' }, grp);
      const top = sv('g', { class: 'press' }, grp);
      sv('rect', { x, y, width: 68, height: 62, rx: 10, class: `c-key ${k === 'enter' ? 'go' : k === 'clear' ? 'stop' : ''}` }, top);
      const word = k === 'clear' ? g.t.clear : k === 'enter' ? g.t.enter : k;
      svText(top, x + 34, y + (LETTERS[k] ? 33 : k.length > 1 ? 36 : 40), word, { 'text-anchor': 'middle', class: 't-key', 'font-size': k.length > 1 ? 13 : 24, 'font-weight': k.length > 1 ? 600 : 500 });
      if (LETTERS[k]) svText(top, x + 34, y + 50, LETTERS[k], { 'text-anchor': 'middle', class: 't-key-small', 'font-size': 9, 'letter-spacing': 2 });
      grp.addEventListener('click', () => press(k));
      keyEls[k] = grp;
    });
    const flash = el('div', 'flash');
    $('mg-body').append(svg, flash);
    hint(g.t.keypad_memorize);
    keyBar([['ENTER', g.t.enter], ['0-9', g.t.key_type]]);

    const showInput = () => { shown.textContent = input.padEnd(code.length, '_'); };
    shown.textContent = showMs > 0 ? code : '';
    const light = (which, ms) => {
      which.classList.add('on');
      if (ms) setTimeout(() => which.classList.remove('on'), ms);
    };
    const flick = (k) => {
      const b = keyEls[k];
      if (!b) return;
      b.classList.add('down');
      setTimeout(() => b.classList.remove('down'), 90);
    };
    const press = (k) => {
      if (!entering || g.ended) return;
      flick(k);
      if (k !== 'enter') sound('click');
      if (k === 'clear') input = '';
      else if (k === 'back') input = input.slice(0, -1);
      else if (k === 'enter') {
        if (M.keypadCheck(code, input)) { light(green); return finish(true); }
        light(red, 700);
        attempts -= 1;
        counter(g.t.attempts, attempts);
        if (attempts <= 0) return finish(false, g.t.keypad_wrong);
        sound('bad');
        flash.textContent = g.t.keypad_wrong;
        input = '';
      } else if (input.length < code.length) input += k;
      showInput();
    };
    if (showMs > 0) startTimer(showMs / 1000, false);
    g.onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('back');
      else if (e.key === 'Enter') press('enter');
    };
    const enter = () => {
      if (g.ended || game !== g) return;
      entering = true;
      svg.classList.add('entering');
      hint(g.t.keypad_enter);
      counter(g.t.attempts, attempts);
      showInput();
      startTimer(o.time || 15);
    };
    if (showMs > 0) setTimeout(enter, showMs); else enter();
  };

  // THERMITE: a thermal charge's control unit with rubber pads. Remember the pads that light up,
  // then press them.
  Games.thermite = function (g) {
    const o = g.o;
    const size = o.size || 6;
    const squares = M.thermiteSquares(g.rand, size, o.squares || 7);
    const found = [];
    let mistakes = o.mistakes || 0;
    let clicking = false;

    const svg = svgBox(368, 460, 'thermite');
    // the two wires to the charge, out of the top
    sv('path', { d: 'M120 0 C 120 -40 90 -60 60 -90', class: 'c-wire-red' }, svg);
    sv('path', { d: 'M146 0 C 146 -40 170 -70 200 -95', class: 'c-wire-black' }, svg);
    sv('rect', { x: 104, y: -8, width: 60, height: 18, rx: 4, class: 'c-plug' }, svg);
    sv('rect', { x: 0.5, y: 6.5, width: 367, height: 452, rx: 18, class: 'c-plastic' }, svg);
    svText(svg, 36, 52, 'THERMAL CHARGE', { class: 't-print-light', 'font-size': 13, 'letter-spacing': 3, 'font-weight': 600 });
    svText(svg, 36, 72, 'TC-6 · IGNITION CONTROL', { class: 't-print', 'font-size': 10, 'letter-spacing': 2 });
    const led = sv('circle', { cx: 322, cy: 50, r: 5, class: 'c-led amber' }, svg);
    sv('rect', { x: 28, y: 106, width: 312, height: 312, rx: 10, class: 'c-recess' }, svg);
    const gap = 8, cell = (296 - gap * (size - 1)) / size;
    const pads = [...Array(size * size).keys()].map((i) => {
      const x = 36 + (i % size) * (cell + gap), y = 114 + Math.floor(i / size) * (cell + gap);
      const grp = sv('g', { class: 'btn pad' + (squares.includes(i) ? ' lit' : '') }, svg);
      sv('rect', { x, y: y + 2, width: cell, height: cell, rx: 5, class: 'c-pad-side' }, grp);
      sv('rect', { x, y, width: cell, height: cell, rx: 5, class: 'c-pad' }, grp);
      sv('rect', { x: x + cell * 0.2, y: y + cell * 0.15, width: cell * 0.6, height: cell * 0.35, rx: 4, class: 'c-pad-shine' }, grp);
      grp.addEventListener('click', () => {
        if (!clicking || g.ended) return;
        const r = M.thermiteClick(squares, found, i);
        if (r === 'again') return;
        if (r === 'miss') {
          grp.classList.add('miss');
          mistakes -= 1;
          counter(g.t.mistakes, Math.max(0, mistakes));
          if (mistakes < 0) return finish(false);
          return sound('bad');
        }
        found.push(i);
        grp.classList.add('hit');
        if (r === 'done') return finish(true);
        sound('good');
      });
      return grp;
    });
    $('mg-body').append(svg);
    hint(g.t.thermite_memorize);
    keyBar([['mouse', g.t.key_pick]]);
    led.classList.add('on');
    startTimer((o.show || 2500) / 1000, false);
    setTimeout(() => {
      if (g.ended || game !== g) return;
      clicking = true;
      pads.forEach((p) => p.classList.remove('lit'));
      led.classList.remove('on');
      hint(g.t.thermite_click);
      counter(g.t.mistakes, mistakes);
      startTimer(o.time || 12);
    }, o.show || 2500);
  };

  // WIRES: an electrical box with terminal blocks; cut the wires in the order of the clues on the
  // sticky note. Every wire has a marker sleeve with its colour's name (MG.Wires.labels).
  Games.wires = function (g) {
    const o = g.o;
    const puzzle = M.makeWires(g.rand, o.wires || 5, o.cuts || 3);
    const n = puzzle.colors.length;
    let done = 0;
    const H = 110 + n * 50;
    const svg = svgBox(540, H, 'wires');
    sv('rect', { x: 0.5, y: 0.5, width: 539, height: H - 1, rx: 10, class: 'c-paint' }, svg);
    sv('rect', { x: 0.5, y: 0.5, width: 539, height: H - 1, rx: 10, class: 'c-brush' }, svg);
    screw(svg, 18, 18); screw(svg, 522, 18, 80); screw(svg, 18, H - 18, 110); screw(svg, 522, H - 18, 5);
    sv('rect', { x: 30, y: 44, width: 480, height: H - 80, rx: 6, class: 'c-cavity' }, svg);
    const clueText = (c) => {
      if (c.kind === 'color') return fmt(g.t.clue_color, g.t[c.color]);
      if (c.kind === 'position') return fmt(g.t.clue_position, c.n);
      return fmt(c.kind === 'below' ? g.t.clue_below : g.t.clue_above, g.t['n_' + c.color]);
    };
    const note = el('div', 'note');
    const clues = el('ol');
    note.append(clues);
    const items = puzzle.clues.map((c, i) => {
      const li = el('li', i === 0 ? 'current' : '', clueText(c));
      clues.append(li);
      return li;
    });
    puzzle.colors.forEach((color, i) => {
      const y = 94 + i * 50;
      sv('rect', { x: 44, y: y - 14, width: 34, height: 28, rx: 3, class: 'c-terminal' }, svg);
      screw(svg, 61, y, 20 + i * 25);
      sv('rect', { x: 462, y: y - 14, width: 34, height: 28, rx: 3, class: 'c-terminal' }, svg);
      screw(svg, 479, y, 60 - i * 20);
      const grp = sv('g', { class: 'btn wire' }, svg);
      const whole = sv('g', {}, grp);
      sv('rect', { x: 78, y: y - 7, width: 384, height: 14, rx: 7, fill: WIRE_HEX[color], class: 'c-insulation' }, whole);
      sv('rect', { x: 78, y: y - 7, width: 384, height: 14, rx: 7, class: 'c-round' }, whole);
      sv('rect', { x: 78, y: y - 12, width: 384, height: 24, fill: 'transparent' }, grp); // easier to click
      if (o.labels !== false) {
        sv('rect', { x: 96, y: y - 9, width: 52, height: 18, rx: 2, class: 'c-sleeve' }, grp);
        svText(grp, 122, y + 3.5, g.t['n_' + color].toUpperCase(), { 'text-anchor': 'middle', class: 't-sleeve', 'font-size': 9, 'font-weight': 700, 'letter-spacing': 0.8 });
      }
      grp.addEventListener('click', () => {
        if (g.ended || grp.classList.contains('cut')) return;
        const r = M.cutWire(puzzle, done, i);
        // the cut: a gap in the middle with the copper showing at both ends
        grp.classList.add('cut');
        sv('rect', { x: 250, y: y - 10, width: 28, height: 20, class: 'c-cut-gap' }, grp);
        sv('rect', { x: 250, y: y - 3, width: 7, height: 6, class: 'c-copper' }, grp);
        sv('rect', { x: 271, y: y - 3, width: 7, height: 6, class: 'c-copper' }, grp);
        if (r === 'wrong') { grp.classList.add('wrong'); return finish(false); }
        items[done].className = 'done';
        done += 1;
        if (r === 'done') return finish(true);
        sound('good');
        items[done].className = 'current';
      });
    });
    const row = el('div', 'row');
    row.append(svg, note);
    $('mg-body').append(row);
    hint(g.t.wires_hint);
    keyBar([['mouse', g.t.key_cut]]);
    startTimer(o.time || 20);
  };

  // LOCKPICK: the lock cut open: springs, driver pins and key pins over the brass plug, the pick
  // under the pin it works on. Stop the marker on the scale in the sweet spot, once for every pin.
  Games.lockpick = function (g) {
    const o = g.o;
    const zone = o.zone || 0.13;
    const pins = M.makePins(g.rand, o.pins || 4, zone);
    let current = 0;
    let lives = o.lives || 1;
    let started = performance.now();
    let pos = 0;

    const svg = svgBox(520, 330, 'lockpick');
    sv('rect', { x: 30, y: 10, width: 460, height: 230, rx: 16, class: 'c-steel' }, svg);
    sv('rect', { x: 30, y: 10, width: 460, height: 230, rx: 16, class: 'c-brush' }, svg);
    sv('rect', { x: 46, y: 110, width: 428, height: 118, rx: 10, class: 'c-brass' }, svg);
    sv('line', { x1: 46, y1: 112, x2: 474, y2: 112, class: 'c-shear' }, svg);
    const step = Math.min(62, 330 / pins.length), x0 = 260 - (step * (pins.length - 1)) / 2;
    const stacks = pins.map((_, i) => {
      const x = x0 + i * step;
      sv('rect', { x: x - 13, y: 28, width: 26, height: 150, class: 'c-chamber' }, svg);
      const grp = sv('g', { class: 'stack' }, svg);
      let d = `M${x} 32`;
      for (let k = 0; k < 8; k++) d += ` L${x + (k % 2 ? -9 : 9)} ${36 + k * 6}`;
      const spring = sv('path', { d, class: 'c-spring' }, grp);
      const lift = sv('g', {}, grp);
      sv('rect', { x: x - 10, y: 82, width: 20, height: 36, rx: 3, class: 'c-pin-steel' }, lift);
      sv('path', { d: `M${x - 10} 128 h20 v34 l-10 8 l-10 -8 z`, class: 'c-pin-brass' }, lift);
      const mark = sv('rect', { x: x - 15, y: 26, width: 30, height: 154, class: 'c-current' }, svg);
      return { x, grp, spring, lift, mark };
    });
    sv('rect', { x: 46, y: 186, width: 428, height: 26, class: 'c-keyway' }, svg);
    const pick = sv('path', { class: 'c-pick' }, svg);
    sv('path', { d: 'M-40 222 H 70 v 14', class: 'c-tension' }, svg);
    // the scale: the sweet spot and the moving marker
    const scale = sv('g', { class: 'btn' }, svg);
    sv('rect', { x: 30, y: 270, width: 460, height: 18, rx: 9, class: 'c-track' }, scale);
    const zoneEl = sv('rect', { y: 270, height: 18, class: 'c-zone' }, scale);
    const zl = sv('line', { y1: 266, y2: 292, class: 'c-zone-edge' }, scale);
    const zr = sv('line', { y1: 266, y2: 292, class: 'c-zone-edge' }, scale);
    const marker = sv('rect', { y: 264, width: 4, height: 30, rx: 2, class: 'c-marker' }, scale);
    const counterText = svText(svg, 30, 316, '', { class: 't-under', 'font-size': 11, 'letter-spacing': 2 });
    const flash = el('div', 'flash');
    $('mg-body').append(svg, flash);
    hint(g.t.do_lockpick);
    keyBar([['SPACE', g.t.key_set]]);
    counter(g.t.lives, lives);

    const X = (v) => 30 + v * 460;
    const place = () => {
      const a = X(pins[current] - zone / 2), b = X(pins[current] + zone / 2);
      zoneEl.setAttribute('x', a); zoneEl.setAttribute('width', b - a);
      zl.setAttribute('x1', a); zl.setAttribute('x2', a); zr.setAttribute('x1', b); zr.setAttribute('x2', b);
      stacks.forEach((s, i) => {
        s.mark.style.display = i === current ? '' : 'none';
        s.grp.classList.toggle('set', i < current);
        if (i < current) s.lift.setAttribute('transform', 'translate(0 -12)');
      });
      counterText.textContent = `${Math.min(current + 1, pins.length)} / ${pins.length}`;
      const x = stacks[Math.min(current, pins.length - 1)].x;
      pick.setAttribute('d', `M-10 199 H ${x - 8} q 8 0 10 -9 l 3 -6`);
    };
    place();
    const tryPin = () => {
      if (g.ended) return;
      if (M.inZone(pos, pins[current], zone)) {
        current += 1;
        flash.textContent = '';
        if (current >= pins.length) { place(); return finish(true); }
        place();
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
    svg.addEventListener('click', tryPin);
    g.onKey = (e) => { if (e.code === 'Space') { e.preventDefault(); tryPin(); } };
    g.frame = (now) => {
      pos = M.sweep((now - started) / 1000, o.speed || 1);
      marker.setAttribute('x', X(pos) - 2);
      // the pin being worked on rises a little as the marker nears the sweet spot
      if (current < pins.length) {
        const near = Math.max(0, 1 - Math.abs(pos - pins[current]) / (zone * 2));
        stacks[current].lift.setAttribute('transform', `translate(0 ${-6 * near})`);
      }
    };
    if (o.time) startTimer(o.time);
  };

  // FINGERPRINT: a tall print, cut into 4 bands (top to bottom). drawPrint draws the whole print, or
  // one band of it (band 0-3) stretched over the canvas.
  const PRINT_W = 240, PRINT_H = 400;
  function drawPrint(canvas, seed, band) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (band !== undefined) {
      ctx.scale(canvas.width / PRINT_W, canvas.height / (PRINT_H / 4));
      ctx.translate(0, -band * PRINT_H / 4);
    } else ctx.scale(canvas.width / PRINT_W, canvas.height / PRINT_H);
    ctx.strokeStyle = cssColor('--print') || '#dff4ff';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const line of M.ridges(seed)) {
      ctx.beginPath();
      line.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x * PRINT_W, p.y * PRINT_H) : ctx.lineTo(p.x * PRINT_W, p.y * PRINT_H)));
      ctx.stroke();
    }
    ctx.restore();
  }

  // Like the Casino heist's fingerprint cloner: a digital timer and lives on top, 8 components in two
  // columns (dim until picked), the print on the right cut into 4 bands, a processing bar on each
  // check, the prints to clone and a segmented scramble bar at the bottom. Arrow keys / WASD and SPACE
  // (or the mouse) pick, TAB checks.
  Games.fingerprint = function (g) {
    const o = g.o;
    const total = Math.max(1, o.prints || 1);
    const scrambleSecs = Number(o.scramble) || 0;
    const maxLives = o.lives || 1;
    let lives = maxLives;
    let done = 0, cursor = 0, busy = false;
    let print, pieces, selected, scrambleAt;

    const screen = el('div', 'fp-screen');
    // top: the timer as big digits, and the lives
    const top = el('div', 'fp-top');
    const clock = el('div', 'fp-clock', '00:00:00');
    const lifeRow = el('div', 'fp-lives');
    const lifeEls = [...Array(maxLives)].map(() => { const l = el('span', 'fp-life'); lifeRow.append(l); return l; });
    top.append(clock, lifeRow);
    // middle: the components and the print
    const main = el('div', 'fp-main');
    const grid = el('div', 'fp-comps');
    const printBox = el('div', 'fp-print');
    const target = el('canvas');
    target.width = PRINT_W; target.height = PRINT_H;
    printBox.append(target);
    for (let b = 1; b < 4; b++) { const d = el('span', 'fp-cut'); d.style.top = `${b * 25}%`; printBox.append(d); }
    // the window over the print while a check runs: a processing bar, then the answer
    const win = el('div', 'fp-window hidden');
    const winBar = el('div', 'fp-window-bar');
    const winSegs = [...Array(12)].map(() => { const sg = el('span'); winBar.append(sg); return sg; });
    const winText = el('div', 'fp-window-text');
    win.append(winBar, winText);
    printBox.append(win);
    main.append(grid, printBox);
    // bottom: the prints to clone, and the scramble bar
    const bottom = el('div', 'fp-bottom');
    const prints = el('div', 'fp-prints');
    const printEls = [...Array(total)].map((_, k) => { const b = el('span', 'fp-slot', String(k + 1)); prints.append(b); return b; });
    const scr = el('div', 'fp-scramble');
    const scrSegs = [...Array(20)].map(() => { const sg = el('span'); scr.append(sg); return sg; });
    if (!scrambleSecs) scr.classList.add('hidden');
    bottom.append(prints, scr);
    screen.append(top, main, bottom);
    const flash = el('div', 'flash');
    $('mg-body').append(screen, flash);

    let tiles = [];
    const render = () => {
      grid.textContent = '';
      grid.style.gridTemplateColumns = `repeat(${M.fpColumns(pieces.length)}, auto)`;
      tiles = pieces.map((p, k) => {
        const c = p.tile;
        c.className = 'fp-comp' + (selected.includes(p) ? ' selected' : '') + (k === cursor ? ' cursor' : '');
        c.onclick = () => { cursor = k; toggle(); };
        grid.append(c);
        return c;
      });
      printEls.forEach((e, k) => { e.className = 'fp-slot' + (k < done ? ' done' : k === done ? ' current' : ''); });
    };
    const newPrint = () => {
      print = M.makeFingerprint(g.rand, o.decoys ?? 4);
      pieces = print.pieces.map((p) => {
        const tile = el('div', 'fp-comp');
        const c = el('canvas');
        c.width = PRINT_W; c.height = PRINT_H / 4;
        drawPrint(c, p.seed, p.part);
        tile.append(c);
        return Object.assign({}, p, { tile });
      });
      selected = [];
      cursor = 0;
      drawPrint(target, print.seed);
      scrambleAt = scrambleSecs ? performance.now() + scrambleSecs * 1000 : null;
      render();
    };
    const toggle = () => {
      if (g.ended || busy) return;
      const p = pieces[cursor];
      if (selected.includes(p)) selected = selected.filter((s) => s !== p);
      else if (selected.length < 4) selected.push(p);
      else return sound('bad');
      sound('click');
      render();
    };
    // a check: the processing bar fills, then the answer shows for a moment
    const tryCheck = () => {
      if (g.ended || busy) return;
      if (selected.length !== 4) return sound('bad'); // 4 pieces first
      const picked = selected.map((p) => pieces.indexOf(p));
      const right = M.fingerprintCheck(pieces, picked);
      busy = true;
      flash.textContent = '';
      win.className = 'fp-window';
      winText.textContent = '';
      winSegs.forEach((sg) => sg.classList.remove('on'));
      winSegs.forEach((sg, k) => setTimeout(() => { if (game === g) { sg.classList.add('on'); post('sound', { name: 'move' }); } }, 60 * k));
      setTimeout(() => {
        if (g.ended || game !== g) return;
        win.className = `fp-window ${right ? 'good' : 'bad'}`;
        winText.textContent = right ? g.t.fp_cloned : g.t.no_match;
        if (right) {
          done += 1;
          render();
          if (done >= total) return finish(true);
          sound('good');
          setTimeout(() => { if (g.ended || game !== g) return; win.className = 'fp-window hidden'; busy = false; newPrint(); }, 800);
          return;
        }
        lives -= 1;
        lifeEls.forEach((l, k) => l.classList.toggle('lost', k >= lives));
        tiles.forEach((t, k) => { if (picked.includes(k)) t.classList.add('wrong'); });
        if (lives <= 0) return finish(false, g.t.no_match);
        sound('bad');
        setTimeout(() => {
          if (g.ended || game !== g) return;
          win.className = 'fp-window hidden';
          busy = false;
          selected = [];
          render();
        }, 800);
      }, 60 * winSegs.length + 150);
    };
    const DIRS = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
    g.onKey = (e) => {
      if (DIRS[e.code]) {
        e.preventDefault();
        const next = M.fpMove(cursor, DIRS[e.code], pieces.length, M.fpColumns(pieces.length));
        if (next !== cursor && !busy) { cursor = next; sound('move'); render(); }
      } else if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); toggle(); }
      else if (e.code === 'Tab') { e.preventDefault(); tryCheck(); }
    };
    const pad = (n) => String(n).padStart(2, '0');
    g.frame = (now) => {
      // the clock: minutes, seconds, hundredths
      if (game.timerEnd) {
        const left = Math.min(game.timerLength, Math.max(0, game.timerEnd - now));
        clock.textContent = `${pad(Math.floor(left / 60000))}:${pad(Math.floor(left / 1000) % 60)}:${pad(Math.floor(left / 10) % 100)}`;
      }
      // the print flickers while it's scanned
      target.style.opacity = busy ? 1 : String(0.7 + Math.random() * 0.3);
      if (!scrambleAt || busy) return;
      const left = scrambleAt - now;
      const lit = Math.ceil((Math.max(0, left) / (scrambleSecs * 1000)) * scrSegs.length);
      scrSegs.forEach((sg, k) => sg.classList.toggle('on', k < lit));
      if (left <= 0) {
        const at = pieces[cursor];
        pieces = M.fpScramble(g.rand, pieces);
        selected = [];
        cursor = Math.max(0, pieces.indexOf(at));
        flash.textContent = g.t.fp_scrambled;
        sound('bad');
        scrambleAt = now + scrambleSecs * 1000;
        render();
      }
    };
    newPrint();
    hint(g.t.do_fingerprint);
    keyBar([['TAB', g.t.check], ['SPACE', g.t.key_pick], ['↑ ↓ ← →', g.t.btn_move]]);
    startTimer(o.time || 40);
  };

  // HOTWIRE: under the steering column: the ignition lock, the wires out of a ribbed sleeve, and a
  // terminal strip with printed labels (in other colours when `tricky`). Click a wire, then its
  // colour's name.
  Games.hotwire = function (g) {
    const o = g.o;
    const puzzle = M.makeHotwire(g.rand, o.wires || 4, o.tricky);
    const n = puzzle.wires.length;
    const connected = [], usedTerms = [];
    let mistakes = o.mistakes || 0;
    let picked = null;

    const H = Math.max(320, 110 + n * 62);
    const svg = svgBox(640, H, 'hotwire');
    sv('rect', { x: 0, y: 0, width: 640, height: H, rx: 6, class: 'c-dash' }, svg);
    sv('path', { d: 'M0 0 H640 V40 Q 320 70 0 40 Z', class: 'c-dash-lip' }, svg);
    sv('circle', { cx: 120, cy: 40, r: 30, class: 'c-steel' }, svg);
    sv('rect', { x: 104, y: 34, width: 32, height: 12, rx: 2, class: 'c-keyhole' }, svg);
    // the ribbed sleeve the wires come out of
    sv('rect', { x: 18, y: 80, width: 54, height: H - 110, rx: 27, class: 'c-sleeve-tube' }, svg);
    for (let y = 88; y < H - 36; y += 10.5) sv('line', { x1: 18, y1: y, x2: 72, y2: y, class: 'c-rib' }, svg);
    sv('rect', { x: 458, y: 50, width: 154, height: n * 62 + 10, rx: 6, class: 'c-strip' }, svg);
    const lines = sv('g', {}, svg);
    const wireY = (i) => 100 + i * ((H - 170) / Math.max(1, n - 1));
    const termY = (j) => 60 + j * 62;
    const wireEls = puzzle.wires.map((color, i) => {
      const y = wireY(i);
      const grp = sv('g', { class: 'btn hw-wire' }, svg);
      const d = `M70 ${y} C 150 ${y} 180 ${y + 6} 230 ${y + 10}`;
      sv('path', { d, class: 'c-outline' }, grp);
      sv('path', { d, stroke: WIRE_HEX[color], class: 'c-cable' }, grp);
      sv('path', { d, class: 'c-cable-shine', transform: 'translate(0 -3)' }, grp);
      sv('line', { x1: 236, y1: y + 10.5, x2: 254, y2: y + 11.5, class: 'c-bare' }, grp);
      if (o.labels !== false) {
        sv('rect', { x: 92, y: y - 9, width: 52, height: 18, rx: 2, class: 'c-sleeve' }, grp);
        svText(grp, 118, y + 3.5, g.t['n_' + color].toUpperCase(), { 'text-anchor': 'middle', class: 't-sleeve', 'font-size': 9, 'font-weight': 700, 'letter-spacing': 0.8 });
      }
      grp.addEventListener('click', () => {
        if (g.ended || connected.includes(i)) return;
        picked = i;
        wireEls.forEach((e, j) => e.classList.toggle('picked', j === i));
        sound('click');
      });
      return grp;
    });
    // a connected wire runs from the sleeve to the terminal's screw
    const link = (i, j) => {
      const y = wireY(i), ty = termY(j) + 14;
      const d = `M70 ${y} C 250 ${y} 330 ${ty} 480 ${ty}`;
      sv('path', { d, stroke: WIRE_HEX[puzzle.wires[i]], class: 'c-cable' }, lines);
      sv('path', { d, class: 'c-cable-shine', transform: 'translate(0 -3)' }, lines);
      wireEls[i].style.display = 'none';
    };
    puzzle.terminals.forEach((term, j) => {
      const y = termY(j);
      const grp = sv('g', { class: 'btn hw-term' }, svg);
      const dark = LIGHT_INK.includes(term.ink);
      sv('rect', { x: 470, y: y - 4, width: 130, height: 36, rx: 3, class: dark ? 'c-label-dark' : 'c-label' }, grp);
      sv('circle', { cx: 490, cy: y + 14, r: 9, class: 'c-brass-screw' }, grp);
      sv('line', { x1: 484, y1: y + 14, x2: 496, y2: y + 14, class: 'c-brass-slot' }, grp);
      svText(grp, 548, y + 20, g.t['n_' + term.name].toUpperCase(), { 'text-anchor': 'middle', fill: WIRE_HEX[term.ink], class: 't-label', 'font-size': 15, 'font-weight': 700, 'letter-spacing': 1.5 });
      grp.addEventListener('click', () => {
        if (g.ended || picked === null || usedTerms.includes(j)) return;
        const r = M.connectWire(puzzle, connected, picked, j);
        if (r === 'used') return;
        if (r === 'wrong') {
          mistakes -= 1;
          counter(g.t.mistakes, Math.max(0, mistakes));
          grp.classList.remove('spark'); void grp.getBoundingClientRect(); grp.classList.add('spark');
          if (mistakes < 0) return finish(false, g.t.sparks);
          flash.textContent = g.t.sparks;
          return sound('bad');
        }
        connected.push(picked);
        usedTerms.push(j);
        grp.classList.add('connected');
        link(picked, j);
        picked = null;
        flash.textContent = '';
        if (r === 'done') return finish(true);
        sound('good');
      });
    });
    const flash = el('div', 'flash');
    $('mg-body').append(svg, flash);
    hint(g.t.do_hotwire);
    keyBar([['mouse', g.t.key_connect]]);
    counter(g.t.mistakes, mistakes);
    startTimer(o.time || 16);
  };

  // A tablet around a game's screen
  function tablet(...parts) {
    const t = el('div', 'tablet');
    const glass = el('div', 'tablet-glass');
    glass.append(...parts);
    t.append(el('span', 'tablet-cam'), glass);
    return t;
  }

  // LASER GRID: a tablet showing the room's floor plan. Cross it without touching a laser.
  const MOVE_KEYS = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
  Games.lasers = function (g) {
    const o = g.o;
    const beams = M.makeLasers(g.rand, o.walls ?? 4, o.sweepers ?? 1, o.speed || 0.7, o.gap || 0.28);
    const W = 624, H = Math.round(W * M.ROOM_H), S = W; // S: pixels per room width
    const canvas = el('canvas', 'room');
    canvas.width = W; canvas.height = H;
    const flash = el('div', 'flash');
    $('mg-body').append(tablet(canvas), flash);
    const ctx = canvas.getContext('2d');
    let p = { ...M.LASER_START }, lives = o.lives || 1, safeUntil = 0;
    const sparks = []; // {x, y, vx, vy, life} in pixels, from touching a laser
    const keys = {};
    const t0 = performance.now();
    let last = t0;
    g.onKey = (e) => { if (MOVE_KEYS[e.code]) { keys[MOVE_KEYS[e.code]] = true; e.preventDefault(); } };
    g.onKeyUp = (e) => { if (MOVE_KEYS[e.code]) keys[MOVE_KEYS[e.code]] = false; };
    const laser = cssColor('--laser') || '#ff3b30';
    const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    const draw = (t) => {
      ctx.fillStyle = cssColor('--floor'); ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = cssColor('--floor-line'); ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 29) line(x, 0, x, H);
      for (let y = 0; y < H; y += 29) line(0, y, W, y);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'; ctx.fillRect(0, 0, 0.08 * S, H); // the start
      ctx.fillStyle = cssColor('--good'); ctx.globalAlpha = 0.22; ctx.fillRect(0.95 * S, 0, W - 0.95 * S, H); ctx.globalAlpha = 1; // the exit
      ctx.strokeStyle = cssColor('--wall'); ctx.lineWidth = 6; ctx.strokeRect(0, 0, W, H);
      for (const b of beams) {
        const on = M.beamOn(b, t);
        const pos = M.beamPos(b, t) * S;
        const segs = b.axis === 'v'
          ? [[b.x * S, 0, b.x * S, pos - (b.gap / 2) * S], [b.x * S, pos + (b.gap / 2) * S, b.x * S, H]]
          : [[b.from * S, pos, b.to * S, pos]];
        ctx.strokeStyle = laser;
        for (const s of segs) {
          if (on) { ctx.globalAlpha = 0.18; ctx.lineWidth = 7; line(...s); }
          ctx.globalAlpha = on ? 1 : 0.3; ctx.lineWidth = on ? 2.5 : 1; line(...s);
        }
        ctx.globalAlpha = 1;
      }
      for (const s of sparks) {
        ctx.strokeStyle = s.life > 0.25 ? '#fff6c2' : laser;
        ctx.globalAlpha = Math.min(1, s.life * 2.5);
        ctx.lineWidth = 2;
        line(s.x, s.y, s.x - s.vx * 0.03, s.y - s.vy * 0.03);
      }
      ctx.globalAlpha = 1;
      const blinking = performance.now() < safeUntil && Math.floor(performance.now() / 120) % 2 === 0;
      if (!blinking) {
        ctx.fillStyle = cssColor('--dot') || '#fff';
        ctx.beginPath(); ctx.arc(p.x * S, p.y * S, M.PLAYER_R * S, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)'; ctx.lineWidth = 2; ctx.stroke();
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
    hint(g.t.do_lasers);
    keyBar([['W A S D', g.t.btn_move]]);
    counter(g.t.lives, lives);
    draw(0);
    startTimer(o.time || 35);
  };

  // KEY FILING: a brass key blank in a small bench vice, marker lines where each cut must end, and a
  // file over the cut being worked on. File each cut down to its line, not deeper.
  Games.keyfiling = function (g) {
    const o = g.o;
    const tol = o.tolerance || 0.045;
    const targets = M.makeKeyCuts(g.rand, o.cuts || 5);
    const n = targets.length;
    let depths = targets.map(() => 0);
    let sel = 0, filing = false, lives = o.lives || 1, lastRasp = 0, lastFiling = 0;
    let last = performance.now();
    // Geometry: blade from x0, each cut cw wide, top y0, bottom y1
    const cw = Math.min(64, 330 / n), x0 = 200, y0 = 120, y1 = 200, reach = (y1 - y0) * 0.85;
    const xEnd = x0 + n * cw + 10, W = xEnd + 60;
    const depthY = (d) => y0 + d * reach;
    const svg = svgBox(W, 330, 'keyfiling');
    // the vice: its base and two jaws holding the bow
    sv('rect', { x: 30, y: 236, width: 170, height: 70, rx: 6, class: 'c-vice' }, svg);
    sv('rect', { x: 40, y: 96, width: 70, height: 44, rx: 4, class: 'c-vice' }, svg);
    sv('rect', { x: 40, y: 196, width: 70, height: 44, rx: 4, class: 'c-vice' }, svg);
    // the key: bow, shoulder, blade
    sv('circle', { cx: 110, cy: 168, r: 60, class: 'c-key-brass' }, svg);
    sv('circle', { cx: 96, cy: 168, r: 17, class: 'c-key-hole' }, svg);
    sv('rect', { x: 160, y: 136, width: 40, height: 64, rx: 5, class: 'c-key-brass' }, svg);
    const blade = sv('path', { class: 'c-key-brass' }, svg);
    sv('line', { x1: x0, y1: 182, x2: xEnd, y2: 182, class: 'c-groove' }, svg);
    const cols = targets.map((target, i) => {
      const x = x0 + i * cw;
      sv('rect', { x: x + cw * 0.12, y: depthY(target - tol), width: cw * 0.76, height: 2 * tol * reach, class: 'c-cut-band' }, svg);
      sv('line', { x1: x + cw * 0.12, x2: x + cw * 0.88, y1: depthY(target), y2: depthY(target), class: 'c-cut-line' }, svg);
      const ok = sv('circle', { cx: x + cw / 2, cy: 106, r: 3.5, class: 'c-cut-ok' }, svg);
      const hit = sv('rect', { x, y: 60, width: cw, height: 150, class: 'btn c-hit' }, svg);
      hit.addEventListener('mousedown', (e) => { if (g.ended) return; sel = i; filing = true; e.preventDefault(); });
      return { ok };
    });
    // the file: a steel blade with teeth and a wooden handle, over the selected cut
    const file = sv('g', { class: 'file' }, svg);
    sv('rect', { x: -120, y: -9, width: 190, height: 18, rx: 2, class: 'c-file' }, file);
    sv('path', { d: Array.from({ length: 36 }, (_, k) => `M${-116 + k * 5} -9 l4 18`).join(' '), class: 'c-file-teeth' }, file);
    sv('rect', { x: 70, y: -12, width: 80, height: 24, rx: 10, class: 'c-handle' }, file);
    const filings = sv('g', {}, svg);
    const flash = el('div', 'flash');
    $('mg-body').append(svg, flash);

    const draw = (now) => {
      // the blade's top edge dips into a notch at each cut, then a pointed tip
      let d = `M${x0 - 10} ${y0}`;
      depths.forEach((dep, i) => {
        const x = x0 + i * cw, y = depthY(dep);
        d += ` L${x + cw * 0.14} ${y0} L${x + cw * 0.26} ${y} L${x + cw * 0.74} ${y} L${x + cw * 0.86} ${y0}`;
      });
      d += ` L${xEnd} ${y0} L${xEnd + 28} ${(y0 + y1) / 2} L${xEnd} ${y1} L${x0 - 10} ${y1} Z`;
      blade.setAttribute('d', d);
      cols.forEach((c, i) => c.ok.classList.toggle('on', M.cutOk(depths[i], targets[i], tol)));
      // the file rests on the selected cut, and moves back and forth while filing
      const shake = filing ? Math.sin((now || 0) / 40) * 6 : 0;
      file.setAttribute('transform', `translate(${x0 + sel * cw + cw / 2 + 60 + shake} ${depthY(depths[sel]) - 16}) rotate(-12)`);
    };
    const spark = () => {
      const x = x0 + sel * cw + cw * (0.3 + Math.random() * 0.4), y = depthY(depths[sel]);
      const bit = sv('circle', { cx: x, cy: y, r: 1.4 + Math.random() * 1.2, class: 'filing' }, filings);
      bit.style.setProperty('--dx', `${(Math.random() - 0.5) * 24}px`);
      setTimeout(() => bit.remove(), 650);
    };
    const stopFiling = () => { filing = false; };
    document.addEventListener('mouseup', stopFiling);
    g.onKey = (e) => {
      if (e.code === 'Space') { filing = true; e.preventDefault(); }
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') { sel = Math.max(0, sel - 1); sound('click'); }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') { sel = Math.min(n - 1, sel + 1); sound('click'); }
      draw(performance.now());
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
          if (lives <= 0) { draw(now); document.removeEventListener('mouseup', stopFiling); return finish(false, g.t.key_ruined); }
          sound('bad');
          flash.textContent = g.t.key_ruined;
          depths = targets.map(() => 0);
        }
      }
      draw(now);
      if (M.keyDone(depths, targets, tol)) { document.removeEventListener('mouseup', stopFiling); finish(true); }
    };
    hint(g.t.do_keyfiling);
    keyBar([['SPACE', g.t.key_file], ['← →', g.t.key_choose]]);
    counter(g.t.lives, lives);
    draw(0);
    startTimer(o.time || 40);
  };

  // TRACKER SWEEP: the car from above and a handheld RF detector beside it. Sweep the car with the
  // mouse; the detector's lights and beeps rise near the tracker. Click where it is.
  Games.tracker = function (g) {
    const o = g.o;
    const puzzle = M.makeTracker(g.rand, o.decoys || 0);
    const W = 624, H = Math.round(W * M.ROOM_H), S = W;
    const canvas = el('canvas', 'car');
    canvas.width = W; canvas.height = H;
    // the detector
    const det = svgBox(116, 380, 'detector');
    sv('rect', { x: 52, y: 0, width: 6, height: 90, rx: 3, class: 'c-antenna' }, det);
    sv('circle', { cx: 55, cy: 0, r: 6, class: 'c-antenna' }, det);
    sv('rect', { x: 0.5, y: 80.5, width: 115, height: 298, rx: 18, class: 'c-plastic' }, det);
    svText(det, 58, 108, 'RF SWEEP', { 'text-anchor': 'middle', class: 't-print', 'font-size': 9, 'letter-spacing': 2 });
    sv('rect', { x: 26, y: 116, width: 64, height: 176, rx: 4, class: 'c-recess' }, det);
    const leds = [...Array(10)].map((_, i) => sv('rect', { x: 36, y: 276 - i * 17, width: 44, height: 12, rx: 2, class: `c-bar ${i < 4 ? 'lo' : i < 8 ? 'mid' : 'hi'}` }, det));
    const pct = svText(det, 58, 324, '0%', { 'text-anchor': 'middle', class: 't-display-light', 'font-size': 18 });
    sv('circle', { cx: 58, cy: 352, r: 10, class: 'c-knob' }, det);
    const row = el('div', 'row');
    row.append(canvas, det);
    const flash = el('div', 'flash');
    $('mg-body').append(row, flash);
    const ctx = canvas.getContext('2d');
    let lives = o.lives || 1, scan = null, lastBeep = 0;
    const misses = [];
    let found = null;
    const round = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); };
    // A car seen from above, front to the right: wheels, body, windows, roof, hood, lights
    const drawCar = () => {
      const X = (v) => v * S, Y = (v) => v * H;
      const edge = cssColor('--car-edge');
      ctx.fillStyle = cssColor('--car-wheel');
      for (const [x, y] of [[0.19, 0.06], [0.7, 0.06], [0.19, 0.82], [0.7, 0.82]]) { round(X(x), Y(y), X(0.12), Y(0.12), 8); ctx.fill(); }
      ctx.fillStyle = cssColor('--car-body'); ctx.strokeStyle = edge; ctx.lineWidth = 2;
      round(X(0.08), Y(0.1), X(0.84), Y(0.8), 90); ctx.fill(); ctx.stroke();
      const shade = ctx.createLinearGradient(0, Y(0.1), 0, Y(0.9));
      shade.addColorStop(0, 'rgba(255,255,255,0.18)'); shade.addColorStop(0.5, 'rgba(255,255,255,0)'); shade.addColorStop(1, 'rgba(0,0,0,0.18)');
      ctx.fillStyle = shade; round(X(0.08), Y(0.1), X(0.84), Y(0.8), 90); ctx.fill();
      ctx.fillStyle = cssColor('--car-glass');
      ctx.beginPath(); ctx.moveTo(X(0.3), Y(0.2)); ctx.lineTo(X(0.43), Y(0.23)); ctx.lineTo(X(0.43), Y(0.77)); ctx.lineTo(X(0.3), Y(0.8)); ctx.closePath(); ctx.fill(); // rear window
      ctx.beginPath(); ctx.moveTo(X(0.64), Y(0.22)); ctx.lineTo(X(0.54), Y(0.25)); ctx.lineTo(X(0.54), Y(0.75)); ctx.lineTo(X(0.64), Y(0.78)); ctx.closePath(); ctx.fill(); // windscreen
      ctx.fillStyle = cssColor('--car-roof'); round(X(0.43), Y(0.25), X(0.11), Y(0.5), 6); ctx.fill(); // roof
      ctx.strokeStyle = edge; ctx.globalAlpha = 0.7; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(X(0.7), Y(0.25)); ctx.quadraticCurveTo(X(0.82), Y(0.3), X(0.88), Y(0.36)); ctx.moveTo(X(0.7), Y(0.75)); ctx.quadraticCurveTo(X(0.82), Y(0.7), X(0.88), Y(0.64)); ctx.stroke(); // hood
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#f3e6b0';
      for (const y of [0.22, 0.64]) { round(X(0.9), Y(y), X(0.016), Y(0.14), 3); ctx.fill(); } // headlights
      ctx.fillStyle = '#d23b2f';
      for (const y of [0.22, 0.64]) { round(X(0.084), Y(y), X(0.013), Y(0.14), 3); ctx.fill(); } // taillights
    };
    const draw = (now) => {
      ctx.clearRect(0, 0, W, H);
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
      let s = 0;
      if (scan) {
        s = M.signal(scan, puzzle);
        const pulse = Math.max(0, 1 - (now - lastBeep) / 300);
        const cx = scan.x * S, cy = scan.y * S;
        ctx.strokeStyle = cssColor('--scan') || '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = pulse; ctx.beginPath(); ctx.arc(cx, cy, 30 + (1 - pulse) * 14, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillStyle = cssColor('--scan') || '#fff';
        ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
      }
      const lit = Math.round(s * 10);
      leds.forEach((l, i) => l.classList.toggle('on', i < lit));
      pct.textContent = `${Math.round(s * 100)}%`;
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
    hint(g.t.do_tracker);
    keyBar([['mouse', g.t.key_search]]);
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
    else if (d.action === 'intro') { closeMenu(); openIntro(d); }
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
