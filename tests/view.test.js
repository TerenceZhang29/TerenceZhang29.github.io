/* View-switching test: assets/js/view.js and everything wired to it.
 *
 * Covers the layer that lets a visitor choose between the OS view and the
 * traditional view:
 *   1. view.js itself, executed in a sandbox against fake storage — including
 *      storage that throws — so the "never throws, degrades to memory" promise
 *      is tested as behaviour, not as source text;
 *   2. the pre-paint redirect inlined in index.html agrees with view.js;
 *   3. the first-visit prompt is an accessible modal that asks once;
 *   4. every OS affordance that leaves for the traditional view goes through
 *      the one function that also records the choice.
 *
 * Run with: node tests/run.js   (or on its own: node tests/view.test.js)
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const content = require('./content');

const viewSource = fs.readFileSync('assets/js/view.js', 'utf8');
const homepage = fs.readFileSync('index.html', 'utf8');
const shell = fs.readFileSync('assets/js/os.js', 'utf8');

const KEY = 'terenceos:view';

/* ------------------------------------------------ 1. view.js, as behaviour */

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

/* Runs view.js in a sandbox shaped like the page it would load on. */
function load({ path = '/index.html', search = '', hash = '', local = fakeStorage(), session = fakeStorage(), links = [] } = {}) {
  const nav = { href: null, replaced: null };
  const location = {
    pathname: path, search, hash,
    set href(v) { nav.href = v; }, get href() { return nav.href; }
  };
  const window = {
    location,
    get localStorage() { if (local === 'blocked') throw new Error('SecurityError'); return local; },
    get sessionStorage() { if (session === 'blocked') throw new Error('SecurityError'); return session; }
  };
  const history = { replaceState: (_s, _t, url) => { nav.replaced = url; } };
  const document = { querySelectorAll: (sel) => (sel === '.header-view' ? links : []) };
  vm.runInNewContext(viewSource, { window, document, history });
  return { api: window.terenceView, nav, local, session };
}

/* Round trip through localStorage. */
{
  const { api, local } = load();
  assert.equal(api.key, KEY);
  assert.equal(api.read(), null, 'a first visit has no preference');
  assert.equal(api.write('classic'), true);
  assert.equal(local.data.get(KEY), 'classic', 'the preference lands in localStorage');
  assert.equal(api.read(), 'classic');
  assert.equal(api.write('nonsense'), false, 'only known views can be stored');
  assert.equal(api.read(), 'classic', 'an invalid write leaves the preference alone');
}

/* A tampered stored value is treated as no preference, not as a view. */
{
  const local = fakeStorage();
  local.data.set(KEY, '<script>');
  assert.equal(load({ local }).api.read(), null);
}

/* switchTo records the choice before navigating, for both directions. */
{
  const { api, nav, local } = load();
  api.switchTo('classic');
  assert.equal(local.data.get(KEY), 'classic');
  assert.equal(nav.href, 'classic.html');
  api.switchTo('os');
  assert.equal(local.data.get(KEY), 'os');
  assert.equal(nav.href, 'index.html?view=os', 'the OS link carries ?view=os so the redirect stands down');
  assert.equal(api.switchTo('nowhere'), false, 'unknown views do not navigate');
}

/* Storage ladder: localStorage blocked → sessionStorage; both blocked → memory. */
{
  const { api, session } = load({ local: fakeStorage({ throws: true }) });
  assert.doesNotThrow(() => api.write('os'));
  assert.equal(session.data.get(KEY), 'os', 'falls back to sessionStorage');
  assert.equal(api.read(), 'os');
}
{
  const { api } = load({ local: 'blocked', session: 'blocked' });
  assert.doesNotThrow(() => api.read());
  assert.equal(api.read(), null);
  assert.equal(api.write('classic'), true, 'still accepts the choice');
  assert.equal(api.read(), 'classic', 'and remembers it for the page lifetime');
}

/* Arriving at the desktop from the traditional page records "os" and cleans the URL. */
{
  const { local, nav } = load({ search: '?view=os', hash: '#about' });
  assert.equal(local.data.get(KEY), 'os');
  assert.equal(nav.replaced, '/index.html#about', 'query stripped, deep link kept');
}
{
  const { local, nav } = load({ search: '?review=osx' });
  assert.equal(local.data.has(KEY), false, 'only an exact view=os parameter counts');
  assert.equal(nav.replaced, null);
}

/* On the traditional page, the header link writes the preference, then leaves. */
{
  const handlers = [];
  const link = { addEventListener: (type, fn) => handlers.push([type, fn]) };
  const { local, nav } = load({ path: '/classic.html', links: [link] });
  assert.equal(handlers.length, 1, 'the return link is upgraded');
  let prevented = false;
  handlers[0][1]({ button: 0, preventDefault: () => { prevented = true; } });
  assert.ok(prevented);
  assert.equal(local.data.get(KEY), 'os');
  assert.equal(nav.href, 'index.html?view=os');

  /* Modified clicks (open in new tab) are left to the browser. */
  const before = nav.href;
  nav.href = null;
  handlers[0][1]({ button: 0, metaKey: true, preventDefault: () => { throw new Error('must not prevent'); } });
  assert.equal(nav.href, null);
  nav.href = before;
}

/* view.js never redirects on load — only explicit switches navigate. */
{
  const local = fakeStorage();
  local.data.set(KEY, 'classic');
  const { nav } = load({ local });
  assert.equal(nav.href, null, 'loading view.js with a stored preference does not navigate');
}
assert.ok(!/location\.replace/.test(viewSource), 'view.js must not redirect; that is index.html\'s inline job');

/* ------------------------------------- 2. the pre-paint redirect agrees */

const head = homepage.slice(0, homepage.indexOf('</head>'));
const inline = [...head.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((js) => js.includes(KEY));
assert.ok(inline, 'index.html needs the pre-paint redirect in <head>, using the same storage key as view.js');
assert.match(inline, /try \{[\s\S]*\} catch \(e\) \{\}/, 'the redirect must be guarded: storage access can throw');
assert.match(inline, /location\.replace\('classic\.html'/, 'the redirect must replace history, not push onto it');
assert.match(inline, /!\/\[\?&\]view=os\(&\|\$\)\/\.test\(location\.search\)/, 'the redirect must stand down for ?view=os');

/* Its hash allowlist must be exactly the anchors both views share. */
const allow = inline.match(/\^#\(([^)]+)\)\$/);
assert.ok(allow, 'redirect should carry deep links across with an explicit allowlist');
assert.deepEqual(allow[1].split('|').sort(), [...content.sharedAnchors].sort(),
  'the redirect allowlist and the shared anchors in tests/content.js have diverged');

/* It runs from a behavioural sandbox too, not just by pattern. */
function redirect({ stored, search = '', hash = '', throws = false }) {
  let replaced = null;
  const localStorage = { getItem: (k) => { if (throws) throw new Error('blocked'); return k === KEY ? stored : null; } };
  const location = { search, hash, replace: (u) => { replaced = u; } };
  vm.runInNewContext(inline, { localStorage, location });
  return replaced;
}
assert.equal(redirect({ stored: 'classic' }), 'classic.html');
assert.equal(redirect({ stored: 'classic', hash: '#projects' }), 'classic.html#projects');
assert.equal(redirect({ stored: 'classic', hash: '#profile' }), 'classic.html', 'OS-only anchors are dropped');
assert.equal(redirect({ stored: 'classic', search: '?view=os' }), null);
assert.equal(redirect({ stored: 'os' }), null);
assert.equal(redirect({ stored: null }), null);
assert.doesNotThrow(() => redirect({ stored: 'classic', throws: true }));
assert.equal(redirect({ stored: 'classic', throws: true }), null);

/* Order: the shell calls into the view module, so it must load first. */
assert.ok(homepage.indexOf('assets/js/view.js') < homepage.indexOf('assets/js/os.js'), 'view.js must load before os.js');

/* ------------------------------------------------------- 3. the prompt */

const prompt = homepage.slice(homepage.indexOf('id="viewprompt"'), homepage.indexOf('<script src="assets/js/view.js">'));
assert.match(homepage, /<div class="viewprompt" id="viewprompt" hidden>/, 'the prompt must start hidden');
assert.match(prompt, /role="dialog"/);
assert.match(prompt, /aria-modal="true"/);
for (const attr of ['aria-labelledby', 'aria-describedby']) {
  const id = prompt.match(new RegExp(`${attr}="([^"]+)"`))[1];
  assert.ok(prompt.includes(`id="${id}"`), `${attr} points at a missing element: ${id}`);
}
assert.match(prompt, /Fancy a traditional view\?/);
/* It teaches the two lasting ways across, then offers one quiet shortcut. */
assert.match(prompt, /Try typing <code>classic<\/code> in the terminal/);
assert.match(prompt, /Or check out <code>view<\/code> on the menu bar/);
assert.match(prompt, /<button class="linkbtn viewprompt__go" type="button" id="viewprompt-yes">Take me to classic view now<\/button>/);
assert.ok(!/linkbtn--primary/.test(prompt), 'the shortcut is not highlighted');
/* Dressed as a desktop window: the same title bar and three controls, plus one button. */
assert.match(prompt, /<div class="win__bar viewprompt__bar">/);
for (const act of ['close', 'min', 'max']) {
  assert.match(prompt, new RegExp(`<button class="win__control" type="button" data-act="${act}" aria-label="[^"]+"`), `window control missing: ${act}`);
}
assert.equal((prompt.match(/<button/g) || []).length, 4, 'three window controls and the one shortcut');
assert.ok(!/class="win[ "]/.test(prompt), 'not a .win, or os.js would build it as a desktop app');
assert.match(shell, /if \(act === 'close'\) declineViewPrompt\(\);/, 'close means stay, remembered');
const minimize = shell.match(/function minimizeViewPrompt\(\) \{[\s\S]*?\n\t\}/)[0];
assert.ok(!/write\(/.test(minimize), 'minimize records no choice, so the prompt asks again next visit');
assert.match(shell, /panel\.classList\.toggle\('is-max'\)/, 'full screen toggles the window size');
assert.match(fs.readFileSync('assets/css/os.css', 'utf8'), /\.viewprompt__panel\.is-minimizing \{ animation: viewprompt-min 220ms/, 'minimize animation timing matches the script');
assert.match(prompt, /class="viewprompt__panel" role="dialog" aria-modal="true" tabindex="-1"/, 'the panel can take focus');
assert.match(shell, /viewPrompt\.querySelector\('\.viewprompt__panel'\)\.focus\(\)/,
  'opening focuses the dialog, not the button, so the shortcut is not shown as the primary action');

assert.match(shell, /var PROMPT_DELAY = 3000;/, 'the prompt waits three seconds');
assert.match(shell, /if \(window\.terenceView\.read\(\)\) return;/, 'the prompt only asks when no preference is stored');
assert.match(shell, /function declineViewPrompt\(\) \{\s*if \(window\.terenceView\) window\.terenceView\.write\('os'\);/,
  'declining must be remembered, or the prompt returns on every visit');
assert.match(shell, /if \(promptIsOpen\(\)\) \{\s*if \(e\.key === 'Escape'\) \{ e\.preventDefault\(\); declineViewPrompt\(\); \}\s*return;/,
  'while the prompt is up, Escape declines it and no other shortcut acts');
assert.match(shell, /viewPrompt\.addEventListener\('keydown'[\s\S]{0,120}e\.key !== 'Tab'/, 'focus must be trapped in the prompt');

/* ------------------------------------ 4. every way out records the choice */

assert.match(shell, /function switchView\(view\) \{\s*if \(window\.terenceView && window\.terenceView\.switchTo\(view\)\) return true;/,
  'switchView must go through the shared module');

/* The raw classic.html URL may appear once, as switchView's fallback for a
   missing view.js — nowhere else, or a switch could skip saving the choice. */
assert.equal((shell.match(/classic\.html'/g) || []).length, 1, 'only switchView may navigate to classic.html directly');

assert.match(homepage, /<button type="button" role="menuitem" data-action="classic">/, 'View menu entry missing');
assert.match(shell, /btn\.dataset\.action === 'classic'\) \{ closeMenus\(\); switchView\('classic'\);/, 'View menu entry is not wired');
assert.match(shell, /\{ id: 'classic', name: 'Traditional view',[^}]*view: 'classic' \}/, 'palette entry missing');
assert.match(shell, /if \(app && app\.view\) return switchView\(app\.view\);/, 'palette entries with a view must switch views');
assert.match(shell, /classic: function \(\) \{ switchView\('classic'\);/, 'terminal command missing');
assert.match(shell, /\['classic', 'switch to the traditional view'\]/, 'classic missing from help');
const hidden = shell.match(/var HIDDEN = \[([^\]]*)\]/)[1];
assert.ok(!hidden.includes("'classic'"), 'classic must stay discoverable in help and completion');

console.log('view switching test: PASS');
