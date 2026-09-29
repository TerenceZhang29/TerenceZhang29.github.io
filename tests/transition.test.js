/* ============================================================================
   The shutdown/boot transitions between the two views (stage 6).
   ----------------------------------------------------------------------------
   1. Wiring: both pages load the shared stylesheet and script, the script as
      the first element of <body> so the arriving half is in the first paint.
   2. Behaviour: transition.js run in a sandbox shaped like each page — which
      half plays, what the note carries, skipping, reduced motion, Back.
   3. Contract with view.js: it hands switches over, and still navigates on
      its own when the transition is absent or declines.
   ========================================================================= */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('assets/js/transition.js', 'utf8');
const viewSource = fs.readFileSync('assets/js/view.js', 'utf8');
const styles = fs.readFileSync('assets/css/transition.css', 'utf8');
const homepage = fs.readFileSync('index.html', 'utf8');
const classic = fs.readFileSync('classic.html', 'utf8');
const shell = fs.readFileSync('assets/js/os.js', 'utf8');

const NOTE = 'terenceos:transition';

/* ------------------------------------------------------------ 1. wiring */

for (const [name, page] of [['index.html', homepage], ['classic.html', classic]]) {
  const head = page.slice(0, page.indexOf('</head>'));
  assert.match(head, /<link rel="stylesheet" href="assets\/css\/transition\.css" \/>/,
    `${name} must link transition.css in <head>`);
  assert.match(page, /<body[^>]*>\s*<script src="assets\/js\/transition\.js"><\/script>/,
    `${name} must load transition.js as the first element of <body>, before anything paints`);
}
/* The shutdown window is drawn by both pages; the same faces keep the seam invisible. */
const classicFonts = classic.match(/<link href="(https:\/\/fonts\.googleapis\.com[^"]+)"/)[1];
assert.match(classicFonts, /family=Geist:wght@[^&]*400[^&]*600/, 'classic.html needs Geist for the shutdown window');
assert.match(classicFonts, /family=Geist\+Mono:wght@400/, 'classic.html needs Geist Mono for the shutdown window');

/* Returning visitors sent across by their stored preference are never animated. */
const redirect = homepage.match(/<script>\s*\/\* Honour a stored "traditional view"[\s\S]*?<\/script>/)[0];
assert.ok(!/transition/.test(redirect), 'the pre-paint redirect must stay instant');

/* Sizes come from the viewport, never rem: the two pages have different root sizes. */
assert.ok(!/\drem\b/.test(styles), 'transition.css must not use rem');

/* ---------------------------------------------------------- 2. behaviour */

function fakeStorage({ throws = false } = {}) {
  const data = new Map();
  const guard = (fn) => (...args) => { if (throws) throw new Error('SecurityError'); return fn(...args); };
  return {
    data,
    getItem: guard((k) => (data.has(k) ? data.get(k) : null)),
    setItem: guard((k, v) => { data.set(k, String(v)); }),
    removeItem: guard((k) => { data.delete(k); })
  };
}

function classList() {
  const set = new Set();
  return {
    set,
    add: (...c) => c.forEach((x) => set.add(x)),
    remove: (...c) => c.forEach((x) => set.delete(x)),
    contains: (c) => set.has(c)
  };
}

function node(tag, attrs = {}) {
  const n = {
    tag, attrs: { ...attrs }, children: [], style: {}, className: '', classList: classList(),
    hidden: false, parentNode: null, anims: [], text: '',
    appendChild(c) { n.children.push(c); c.parentNode = n; return c; },
    removeChild(c) { n.children.splice(n.children.indexOf(c), 1); c.parentNode = null; },
    setAttribute(k, v) { n.attrs[k] = String(v); },
    getAttribute(k) { return k in n.attrs ? n.attrs[k] : null; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 634, height: 396 }; },
    animate(frames, opts) {
      const a = { frames, opts, cancelled: false, cancel() { a.cancelled = true; } };
      n.anims.push(a);
      return a;
    }
  };
  Object.defineProperty(n, 'textContent', { get: () => n.text, set: (v) => { n.text = String(v); } });
  return n;
}

/* Runs transition.js in a sandbox shaped like one of the two pages. */
function load({ path = '/index.html', session = fakeStorage(), note = null, reduced = false,
  windows = [], animate = true } = {}) {
  if (note) session.data.set(NOTE, typeof note === 'string' ? note : JSON.stringify(note));
  const nav = { href: null };
  const listeners = [];
  const timers = [];
  const html = node('html');
  const body = node('body');
  if (!animate) delete body.animate;
  const os = node('div');
  const byId = { palette: node('div'), viewprompt: node('div') };
  const window = {
    innerWidth: 1440, innerHeight: 900,
    location: { pathname: path, set href(v) { nav.href = v; }, get href() { return nav.href; } },
    get sessionStorage() { if (session === 'blocked') throw new Error('SecurityError'); return session; },
    matchMedia: () => ({ matches: reduced }),
    addEventListener: (type, fn, capture) => listeners.push({ type, fn, capture }),
    removeEventListener: (type, fn) => {
      const i = listeners.findIndex((l) => l.type === type && l.fn === fn);
      if (i >= 0) listeners.splice(i, 1);
    }
  };
  const document = {
    documentElement: html, body, readyState: 'complete',
    createElement: (tag) => node(tag),
    createTextNode: (text) => ({ text }),
    querySelector: (sel) => (sel === '.os' && path !== '/classic.html' ? os : null),
    querySelectorAll: (sel) => (sel === '.os .win' ? windows : []),
    getElementById: (id) => byId[id] || null,
    addEventListener: () => {}
  };
  const context = {
    window, document,
    getComputedStyle: () => ({ borderTopLeftRadius: '8px' }),
    setTimeout: (fn, ms) => { timers.push({ fn, ms, done: false }); return timers.length; },
    clearTimeout: (id) => { if (timers[id - 1]) timers[id - 1].done = true; },
    Date
  };
  vm.runInNewContext(source, context);
  const run = (upTo) => timers
    .filter((t) => !t.done && t.ms <= upTo)
    .sort((a, b) => a.ms - b.ms)
    .forEach((t) => { t.done = true; t.fn(); });
  const fire = (type, event) => listeners.filter((l) => l.type === type).forEach((l) => l.fn(event));
  return { api: window.terenceTransition, nav, session, html, body, os, byId, listeners, timers, run, fire };
}

const fresh = (kind, extra = {}) => ({ kind, at: Date.now(), ...extra });
const readNote = (session) => JSON.parse(session.data.get(NOTE));

/* A plain visit plays nothing and leaves nothing. */
{
  const page = load();
  assert.equal(page.body.children.length, 0);
  assert.equal(page.html.classList.contains('tx-running'), false);
  assert.equal(typeof page.api.leave, 'function');
}

/* Arriving from a shutdown: the traditional page draws the window in its first paint. */
{
  const page = load({ path: '/classic.html', note: fresh('shutdown', { apps: ['terminal', 'about.txt'] }) });
  assert.equal(page.session.data.has(NOTE), false, 'the note is read once, then gone');
  assert.equal(page.body.children.length, 1, 'the shutdown window is mounted immediately');
  assert.ok(page.html.classList.contains('tx-running'));
  page.run(2600);
  assert.equal(page.body.children.length, 0, 'the overlay is removed at the end');
  assert.equal(page.html.classList.contains('tx-running'), false, 'and leaves no class behind');
}

/* The note only counts on the page it was written for, and only while fresh. */
{
  assert.equal(load({ note: fresh('shutdown') }).body.children.length, 0, 'a shutdown note on the desktop is ignored');
  assert.equal(load({ path: '/classic.html', note: fresh('boot') }).body.children.length, 0,
    'a boot note on the traditional page is ignored');
  const stale = load({ path: '/classic.html', note: { kind: 'shutdown', at: Date.now() - 6000 } });
  assert.equal(stale.body.children.length, 0, 'a stale note (a reload, a Back) never replays');
  assert.equal(stale.session.data.has(NOTE), false, 'and is cleared');
  assert.doesNotThrow(() => load({ path: '/classic.html', note: '{not json' }));
  assert.doesNotThrow(() => load({ path: '/classic.html', session: 'blocked' }));
}

/* Arriving from a boot: the desktop starts under a dark cover, which lifts. */
{
  const page = load({ note: fresh('boot') });
  assert.equal(page.body.children.length, 1, 'the cover is mounted before the desktop paints');
  assert.ok(page.os.anims.length > 0, 'the desktop settles into place');
  page.run(450);
  assert.equal(page.body.children.length, 0);
  assert.equal(page.os.anims.every((a) => a.cancelled), true, 'no animation is left holding the desktop');
}

/* Leaving the desktop: collapse, then hand over with a note naming what was open. */
{
  const win = (title, hidden = false) => Object.assign(node('section', { 'data-title': title }), { hidden });
  const page = load({ windows: [win('terminal — terence@terenceOS'), win('profile'), win('stack.json', true)] });
  page.byId.viewprompt.hidden = false;
  assert.equal(page.api.leave('classic', 'classic.html'), true, 'it takes over the navigation');
  assert.equal(page.nav.href, null, 'and does not navigate straight away');
  assert.equal(page.byId.viewprompt.hidden, true, 'the prompt is put away so it does not float over the collapse');
  assert.ok(page.os.anims.length > 0, 'the desktop collapses');
  const collapse = page.os.anims[0].frames[1];
  assert.match(collapse.transform, /^scale\(0\.44/, 'at 1440×900 the desktop shrinks by exactly the window\'s 0.44');
  page.run(549);
  assert.equal(page.nav.href, null);
  page.run(550);
  assert.equal(page.nav.href, 'classic.html', 'the page changes at the handoff');
  const note = readNote(page.session);
  assert.equal(note.kind, 'shutdown');
  assert.deepEqual([...note.apps], ['terminal', 'profile'], 'open windows only, by their short titles');
  assert.equal(page.api.leave('classic', 'classic.html'), true, 'a second click while it plays is swallowed');
}

/* Leaving the traditional page: boot in a window, grow it, then hand over. */
{
  const page = load({ path: '/classic.html' });
  assert.equal(page.api.leave('os', 'index.html?view=os'), true);
  page.run(2149);
  assert.equal(page.nav.href, null);
  page.run(2150);
  assert.equal(page.nav.href, 'index.html?view=os');
  assert.equal(readNote(page.session).kind, 'boot');
}

/* Only the two real directions animate; anything else is left to view.js. */
{
  assert.equal(load().api.leave('os', 'index.html?view=os'), false);
  assert.equal(load({ path: '/classic.html' }).api.leave('classic', 'classic.html'), false);
  assert.equal(load({ animate: false }).api.leave('classic', 'classic.html'), false,
    'without the Web Animations API it declines');
}

/* Reduced motion: a fade out and in, no geometry. */
{
  const page = load({ reduced: true });
  assert.equal(page.api.leave('classic', 'classic.html'), true);
  assert.equal(page.os.anims.length, 0, 'the desktop does not collapse');
  const fade = page.body.anims[0].frames;
  /* Objects from the sandbox belong to another realm; compare them as plain data. */
  assert.deepEqual(JSON.parse(JSON.stringify(fade.map((f) => Object.keys(f)))), [['opacity'], ['opacity']], 'only opacity changes');
  page.run(200);
  assert.equal(readNote(page.session).kind, 'fade');
  const arriving = load({ path: '/classic.html', note: fresh('fade') });
  assert.ok(arriving.html.classList.contains('tx-fade-in'), 'the arriving page starts invisible');
}
assert.match(styles, /\.tx-fade-in body \{ opacity: 0; \}/);

/* A click or a key skips: leaving, it navigates now with no note; arriving, it finishes. */
{
  const page = load();
  page.api.leave('classic', 'classic.html');
  assert.ok(page.listeners.some((l) => l.type === 'keydown' && l.capture === true), 'keys are caught before the desktop sees them');
  assert.ok(page.listeners.some((l) => l.type === 'pointerdown' && l.capture === true));
  let stopped = false;
  page.fire('keydown', { type: 'keydown', key: 'Shift', preventDefault() {}, stopImmediatePropagation() { stopped = true; } });
  assert.equal(stopped, false, 'a bare modifier is not a skip');
  page.fire('keydown', { type: 'keydown', key: 'Escape', preventDefault() {}, stopImmediatePropagation() { stopped = true; } });
  assert.ok(stopped);
  assert.equal(page.nav.href, 'classic.html', 'skipping leaves at once');
  assert.equal(page.session.data.has(NOTE), false, 'and the next page just appears');

  const arriving = load({ path: '/classic.html', note: fresh('shutdown') });
  arriving.fire('pointerdown', { type: 'pointerdown', preventDefault() {}, stopImmediatePropagation() {} });
  assert.equal(arriving.body.children.length, 0, 'arriving, a click finishes it');
}

/* Back can restore the desktop mid-collapse from memory: it must come back clean. */
{
  const page = load();
  page.body.style.background = '';
  page.api.leave('classic', 'classic.html');
  assert.equal(page.body.style.background, '#05070A');
  page.fire('pageshow', { persisted: false });
  assert.equal(page.body.children.length, 1, 'an ordinary pageshow changes nothing');
  page.fire('pageshow', { persisted: true });
  assert.equal(page.body.children.length, 0, 'the overlay is gone');
  assert.equal(page.body.style.background, '', 'the page\'s own styles are restored');
  assert.equal(page.os.anims.every((a) => a.cancelled), true, 'the collapse is undone');
  assert.equal(page.html.classList.contains('tx-running'), false);
}

/* The boot log only claims what the desktop really does on boot. */
assert.match(source, /'starting terminal'/);
assert.match(source, /'opening profile'/);
const bootDefaults = shell.match(/function bootDefaults\(\) \{[\s\S]*?\n\t\}/)[0];
assert.match(bootDefaults, /terminal/, 'the log says the terminal starts; bootDefaults must open it');
assert.match(bootDefaults, /profile/, 'the log says the profile opens; bootDefaults must open it');

/* ----------------------------------------------- 3. the contract with view.js */

function viewWith(transition) {
  const nav = { href: null };
  const window = {
    location: { pathname: '/index.html', search: '', hash: '', set href(v) { nav.href = v; } },
    localStorage: fakeStorage(), sessionStorage: fakeStorage(), terenceTransition: transition
  };
  vm.runInNewContext(viewSource, { window, document: { querySelectorAll: () => [] }, history: {} });
  return { api: window.terenceView, nav, window };
}
{
  const calls = [];
  const taken = viewWith({ leave: (view, href) => { calls.push([view, href]); return true; } });
  taken.api.switchTo('classic');
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [['classic', 'classic.html']], 'switchTo hands the switch to the transition');
  assert.equal(taken.nav.href, null, 'and lets it navigate');
  assert.equal(taken.window.localStorage.data.get('terenceos:view'), 'classic', 'the choice is written first');

  const declined = viewWith({ leave: () => false });
  declined.api.switchTo('classic');
  assert.equal(declined.nav.href, 'classic.html', 'when it declines, view.js navigates');

  const absent = viewWith(undefined);
  absent.api.switchTo('os');
  assert.equal(absent.nav.href, 'index.html?view=os', 'without it, view.js navigates');
}

console.log('transition test: PASS');
