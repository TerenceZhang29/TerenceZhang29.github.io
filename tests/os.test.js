/* terenceOS view test (index.html).
 *
 * Two jobs:
 *   1. the OS view carries every fact in tests/content.js — the same list the
 *      traditional view is checked against, so the two cannot drift;
 *   2. the OS shell is wired up — one Window primitive, a launcher, a dock,
 *      a terminal, deep links, and a phone layout that does not overflow.
 *
 * Run with: node tests/run.js   (or on its own: node tests/os.test.js)
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const content = require('./content');

const homepage = fs.readFileSync('index.html', 'utf8');
const styles = fs.readFileSync('assets/css/os.css', 'utf8');
const script = fs.readFileSync('assets/js/os.js', 'utf8');
const sneakers = fs.readFileSync('sneakers.html', 'utf8');

/* ---------------------------------------------------------- content kept */

/* Experience, checked against tests/content.js — the same list the traditional
   view is checked against. The OS log writes dates as 2025-09 → 2026-02. */
const logEntries = homepage.split('<li class="log__entry">').slice(1);
assert.equal(logEntries.length, content.roles.length, 'one log entry per role');
content.roles.forEach((role, i) => {
  const entry = logEntries[i];
  const facts = [role.title, role.employer, role.url, role.location,
    `${role.from} → ${role.to}`, role.focus, role.summary];
  for (const fact of facts) {
    assert.ok(entry.includes(content.html(fact)), `OS log entry ${i + 1} (${role.employer}) missing: ${fact}`);
  }
  if (role.note) assert.ok(entry.includes(role.note), `OS log missing employer note: ${role.note}`);
  for (const tag of role.tags) {
    assert.ok(entry.includes(`<li>${tag}</li>`), `${role.employer} entry missing tag: ${tag}`);
  }
});

/* The Vicino project window mirrors that role's tags; keep the two in step. */
{
  const vicino = content.roles.find((r) => r.employer === 'Vicino AI');
  const detail = homepage.slice(homepage.indexOf('id="project-vicino"'), homepage.indexOf('id="project-rent"'));
  for (const tag of vicino.tags) {
    assert.ok(detail.includes(`<li>${tag}</li>`), `Vicino project window missing stack tag: ${tag}`);
  }
}
/* stack.json promises every entry maps to shipped work in experience.log, so the
   two must agree in both directions. */
const stackWindow = homepage.slice(homepage.indexOf('id="stack"'), homepage.indexOf('id="contact"'));
const stackItems = [...stackWindow.matchAll(/<li>([^<]+)<\/li>/g)].map((m) => m[1]);
for (const [heading, items] of content.stack) {
  assert.ok(stackWindow.includes(`<h3>${heading}</h3>`), `stack.json missing group: ${heading}`);
  for (const item of items) assert.ok(stackItems.includes(item), `stack.json missing entry: ${item}`);
}
for (const tag of new Set(content.roles.flatMap((r) => r.tags))) {
  assert.ok(stackItems.includes(tag), `experience tag absent from stack.json: ${tag}`);
}
for (const item of stackItems) {
  const claimed = content.stack.some(([, items]) => items.includes(item));
  assert.ok(claimed, `stack.json lists ${item}, which is not in tests/content.js`);
}

for (const project of content.projects) {
  for (const fact of [project.name, project.image, project.url].filter(Boolean)) {
    assert.ok(homepage.includes(fact), `OS view missing project detail: ${fact}`);
  }
}
for (const fact of [...content.links, ...content.biography]) {
  assert.ok(homepage.includes(fact), `OS view missing: ${fact}`);
}
assert.ok(homepage.includes(`<meta name="description" content="${content.description}" />`),
  'OS view meta description missing or reworded');
assert.ok(homepage.includes(`<h1 class="hero">${content.slogan.lead} <em>${content.slogan.accent}</em></h1>`),
  'OS view hero slogan missing or reworded');

/* The profile lists the three past roles, and no view claims a current one. */
for (const role of content.roles.slice(0, 3)) {
  const shown = role.short || role.title;
  assert.ok(homepage.includes(`<strong>${content.html(shown)}</strong> @ `), `profile missing past role: ${shown}`);
}
assert.ok(homepage.includes('<dt>Previously</dt>'), 'the profile should list past roles, not a current one');
assert.match(homepage, /<dt>Studying<\/dt><dd>[^<]*<small>Merit Scholarship<\/small>/,
  'the Merit Scholarship line under the degree is missing');
/* The availability line is the way into contact.json — a real link, so it also
   works before the shell boots and without JavaScript. */
assert.match(homepage, /<a class="profile__status" href="#contact" data-launch="contact">available for interesting problems<\/a>/,
  'the profile status line should link into contact.json');
assert.ok(!homepage.includes('log__entry--current'), 'no experience entry is current any more');
assert.ok(!homepage.includes('log__badge'), 'the "current" badge should be gone');
assert.ok(!homepage.includes('PRESENT'), 'no open-ended date range remains');
assert.ok(!/<h3>Currently<\/h3>/.test(homepage), 'about.txt should no longer have a Currently section');

/* Details only the OS view words this way. */
for (const fact of [
  'CS &amp; Economics · \'22',
  'version control infrastructure for AI agent collaboration',
  'billion-scale distributed systems for digital asset',
  'images/avatar-96.jpg'
]) {
  assert.ok(homepage.includes(fact), `missing biography detail: ${fact}`);
}

/* Existing anchors still resolve, so old inbound links keep working. */
for (const id of content.sharedAnchors) {
  assert.match(homepage, new RegExp(`id="${id}"`), `missing #${id}`);
}

/* --------------------------------------------------------------- the shell */

assert.match(homepage, /class="systembar"/, 'system bar missing');
assert.match(homepage, /terenceOS/, 'OS branding missing');
for (const item of ['File', 'Edit', 'View', 'Window', 'Help']) {
  assert.ok(homepage.includes(`>${item}</button>`), `missing menu bar item: ${item}`);
}
assert.match(homepage, /class="sidebar"/, 'application launcher missing');
assert.match(homepage, /class="shortcuts"/, 'desktop shortcuts missing');
assert.match(homepage, /id="dock"/, 'dock missing');
assert.match(homepage, /class="mobilenav"/, 'phone navigation missing');

/* Every application is a Window, and every Window carries the metadata the
   manager builds its chrome from. Chrome is never hand-written per window. */
const wins = [...homepage.matchAll(/<section class="win"[^>]*>/g)].map((m) => m[0]);
assert.ok(wins.length >= 8, `expected at least 8 windows, found ${wins.length}`);
for (const win of wins) {
  for (const attr of ['data-app', 'data-title', 'data-icon', 'data-w', 'data-h']) {
    assert.ok(win.includes(attr), `window missing ${attr}: ${win}`);
  }
}
/* App windows get their chrome from the manager. The view prompt is not an app: it
   wears the same bar as static markup, and only there. */
const desktopMarkup = homepage.replace(/<div class="viewprompt"[\s\S]*?<script src="assets\/js\/view\.js">/, '');
assert.ok(!desktopMarkup.includes('win__bar'), 'window chrome must be built by the manager, not the markup');
assert.equal((homepage.match(/win__bar/g) || []).length, 1, 'only the view prompt carries a static title bar');
for (const app of ['terminal', 'profile', 'about', 'projects', 'experience', 'stack', 'contact']) {
  assert.ok(homepage.includes(`data-app="${app}"`), `missing application: ${app}`);
}

/* Every application is reachable without the terminal. */
for (const app of ['terminal', 'profile', 'about', 'projects', 'experience', 'stack', 'contact']) {
  assert.ok(homepage.includes(`data-launch="${app}"`), `no launcher for: ${app}`);
}

/* Window behaviour is defined once. */
for (const behaviour of ['function open(', 'function close(', 'function minimize(', 'function toggleMax(', 'function focus(', 'function startDrag(', 'function startResize(']) {
  assert.ok(script.includes(behaviour), `window manager missing ${behaviour}`);
}
assert.match(script, /'close'/, 'close control missing');
assert.match(script, /appFromHash/, 'deep links missing');

/* Terminal: commands exist and map to applications, not to a fake shell. */
for (const cmd of ['help', 'whoami', 'about', 'projects', 'experience', 'stack', 'skills', 'contact', 'resume', 'clear', 'ls']) {
  assert.ok(new RegExp(`\\n\\t\\t${cmd}:`).test(script), `missing terminal command: ${cmd}`);
}
assert.match(script, /ArrowUp/, 'terminal history missing');

/* Tab completes without stealing focus. It used to fall through to the browser
   whenever there was nothing unique to fill in — an ambiguous prefix, an already
   complete command, or a typo — which moved focus out to the dock. */
assert.match(script, /\} else if \(e\.key === 'Tab' && !e\.shiftKey\) \{\s*\/\*[\s\S]*?\*\/\s*if \(!input\.value\) return;\s*e\.preventDefault\(\);/,
  'Tab must claim the key whenever the prompt has text, and only pass it on when empty');
assert.match(script, /function candidates\(value\)/, 'prefix matching helper missing');
assert.match(script, /function commonPrefix\(names\)/, 'shell-style common-prefix completion missing');
assert.match(script, /function listCandidates\(value, names\)/, 'ambiguous prefixes should list the options');
assert.ok(!/e\.key === 'Tab' \|\| \(e\.key === 'ArrowRight'/.test(script),
  'Tab and ArrowRight need separate branches: ArrowRight may fall through, Tab may not');
assert.match(script, /shift\+tab leaves the terminal/, 'the escape hatch should be documented in the help tip');
assert.match(homepage, /id="terminal-input"/, 'terminal input missing');

/* --------------------------------------------------------------- design */

for (const token of ['#080B0F', '#0D1116', '#11161A', '#151A1F', '#232A31', '#303841',
  '#E6E6E6', '#A1A7AE', '#6B7280', '#4B5259', '#A3E635', '#60A5FA', '#C084FC']) {
  assert.ok(styles.includes(token), `missing palette token: ${token}`);
}
for (const family of ['Geist', 'Geist+Mono', 'Inter']) {
  assert.ok(homepage.includes(family), `missing font family: ${family}`);
}
assert.match(styles, /--radius: 0\.5rem;/, 'window radius token missing (8px at the reference scale)');
assert.match(styles, /--shadow-window:/, 'window shadow token missing');
assert.match(styles, /--t-fast:/, 'transition token missing');

/* Accessibility and responsiveness. */
assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/, 'reduced motion support missing');
assert.match(styles, /@media \(max-width: 720px\)/, 'phone layout missing');
assert.match(styles, /:focus-visible \{/, 'visible focus states missing');
assert.ok(!/overflow-x:\s*scroll/.test(styles), 'the page must never scroll horizontally');

const images = [...homepage.matchAll(/<img\b/g)].length;
const altText = [...homepage.matchAll(/<img\b[^>]*\balt="[^"]+"/g)].length;
assert.equal(images, altText, 'every homepage image needs non-empty alt text');

/* Icons are SVG symbols, never emoji. */
assert.match(homepage, /<symbol id="i-terminal"/, 'icon sprite missing');
assert.ok(!/[\u{1F300}-\u{1FAFF}]/u.test(homepage), 'no emoji in the interface');

/* The old stylesheet and its scaling script are no longer loaded. */
assert.ok(!homepage.includes('assets/css/main.css'), 'old portfolio stylesheet still loaded');
assert.ok(!homepage.includes('assets/js/scale.js'), 'old scaling script still loaded');
assert.match(homepage, /<script src="assets\/js\/os\.js"><\/script>/);

/* The sneaker room is deliberately unlisted: the page stays published and keeps
   working, but the desktop no longer advertises it anywhere. The only way in is
   the terminal command, which is itself kept out of help and completion. These
   assertions record that decision — a link reappearing here is a regression. */
assert.match(sneakers, /s_assets\/css\/main\.css/, 'the sneaker room page must keep working');
assert.match(sneakers, /href="index\.html"/, 'the sneaker room must keep its way back');
assert.ok(!homepage.includes('/sneakers.html'), 'the main page must not link to the sneaker room');
assert.ok(!homepage.includes('i-shoe'), 'the sneaker icon should have gone with the links');
assert.match(script, /sneakers: function/, 'the unlisted terminal path must survive');
assert.match(script, /var HIDDEN = \['sudo', 'neofetch', 'sneakers'\]/,
  'sneakers must stay out of help, completion and suggestions');

/* ------------------------------------------------- OS behaviour (stage 2) */

/* One registry behind every entry point, so nothing can drift out of sync. */
assert.match(script, /var APPS = \[/, 'application registry missing');
for (const id of ['terminal', 'about', 'projects', 'experience', 'stack', 'contact',
  'profile', 'project-vicino', 'project-rent', 'project-clubby', 'resume', 'github', 'linkedin', 'email']) {
  assert.ok(script.includes(`id: '${id}'`), `registry missing entry: ${id}`);
}
assert.match(script, /function launch\(/, 'single launch path missing');
assert.match(script, /var QUICK = \['terminal', 'about', 'projects', 'experience', 'stack', 'contact'\]/,
  'Alt+1..6 application order missing');

/* Command palette. */
assert.match(homepage, /id="palette"/, 'command palette missing');
assert.match(homepage, /id="palette-input"/, 'palette input missing');
assert.match(homepage, /role="listbox"/, 'palette results should be a listbox');
assert.match(homepage, /aria-modal="true"/, 'palette should be modal');
for (const fn of ['function openPalette(', 'function closePalette(', 'function renderPalette(', 'function selectPalette(', 'function score(']) {
  assert.ok(script.includes(fn), `palette missing ${fn}`);
}
assert.match(script, /aria-activedescendant/, 'palette should track the active option for screen readers');

/* Keyboard shortcuts: palette, quick-switch, and a layered Escape. */
assert.match(script, /e\.metaKey \|\| e\.ctrlKey.*\n?.*'k'|e\.key\.toLowerCase\(\) === 'k'/, 'Cmd/Ctrl+K missing');
assert.match(script, /\^Digit\[1-6\]\$/, 'Alt+1..6 missing');
assert.match(script, /if \(!palette\.hidden\) \{ closePalette\(\); return; \}/, 'Escape should close the palette first');
/* The number shortcuts must be Alt-only: Cmd/Ctrl+number belongs to the browser. */
assert.match(script, /e\.altKey && !e\.metaKey && !e\.ctrlKey && \/\^Digit\[1-6\]\$\//,
  'number shortcuts must require Alt and never fire with Cmd/Ctrl');

/* Terminal: completion, history, teaching errors, and no real shell. */
assert.match(script, /function completion\(/, 'command completion missing');
assert.match(script, /function syncGhost\(/, 'block cursor mirror missing');
assert.match(script, /'Type '/, 'unknown commands should point at help');
assert.match(script, /command not found: /, 'unknown command message missing');
assert.match(script, /did you mean /, 'command suggestion missing');
assert.match(styles, /@keyframes blink/, 'blinking cursor missing');
assert.ok(!/eval\(|new Function|fetch\(|XMLHttpRequest/.test(script), 'the terminal must not execute or fetch anything');

/* Easter eggs: present, but never required for navigation. */
for (const egg of ['sudo:', 'neofetch:']) {
  assert.ok(script.includes(egg), `missing easter egg: ${egg}`);
}
assert.match(script, /COMMAND_NAMES = Object\.keys\(COMMANDS\)\.filter/, 'easter eggs should stay out of help/completion');

/* Dock: hover name, open and minimized indicators. */
assert.match(script, /btn\.dataset\.tip = rec\.title/, 'dock tooltip missing');
assert.match(script, /dockItem\.dataset\.state = rec\.min \? 'min' : 'open'/, 'dock minimized indicator missing');
assert.match(styles, /\.dock__item::after/, 'dock tooltip styling missing');

/* Performance: no libraries, no boot screen, no polling clock. */
const scriptTags = [...homepage.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]);
const external = scriptTags.filter((t) => t.includes('src=')).map((t) => t.match(/src="([^"]+)"/)[1]);
/* The shell's own script plus the two modules shared with classic.html: the
   switch transition (first, so it can draw before the page paints) and the
   view preference. */
assert.deepEqual(external, ['assets/js/transition.js', 'assets/js/view.js', 'assets/js/os.js'],
  'only first-party scripts, in load order');
assert.ok(!/setInterval/.test(script), 'no continuously running timers');
/* The stage-6 boot animation is not a boot screen: it plays only on an explicit
   switch from the traditional view, never on a plain visit. */
assert.ok(!/class="boot|id="boot/.test(homepage), 'no boot screen was introduced');

/* ----------------------------------------------------- design QA (stage 3) */

/* The portfolio must survive without the shell: no JavaScript, no lost content. */
assert.match(homepage, /<html lang="en" class="no-js">/, 'no-js hook missing');
assert.match(homepage, /classList\.remove\('no-js'\)/, 'no-js class is never removed');
assert.match(styles, /\.no-js \.win, \.no-js \.win\[hidden\]/, 'windows must render without JavaScript');

/* Contrast: the small muted type carries real information, so it must clear AA. */
const luminance = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
const token = (name) => styles.match(new RegExp(`${name}: (#[0-9A-Fa-f]{6});`))[1];
const lightestSurface = token('--elevated');
for (const name of ['--text', '--text-2', '--text-muted', '--green', '--blue', '--purple']) {
  const value = token(name);
  assert.ok(contrast(value, lightestSurface) >= 4.5,
    `${name} (${value}) is ${contrast(value, lightestSurface).toFixed(2)}:1 on ${lightestSurface}, below AA`);
}
/* --text-disabled is deliberately below AA, so it may only dress inert UI. */
for (const informational of ['.terminal__hint {', '.palette__footer {', '.terminal .tip {']) {
  const rule = styles.slice(styles.indexOf(informational), styles.indexOf(informational) + 220);
  assert.ok(!rule.includes('--text-disabled'), `informational text must not use --text-disabled: ${informational}`);
}

/* Assets stay light: the avatar is sized for its slot, detail shots defer. */
assert.ok(fs.statSync('images/avatar-96.jpg').size < 20000, 'avatar should be a right-sized asset');
assert.equal((homepage.match(/loading="lazy"/g) || []).length, 6, 'project images should defer loading');
for (const img of homepage.match(/<img[^>]*>/g)) {
  assert.ok(/width="\d+"/.test(img) && /height="\d+"/.test(img), `image without intrinsic size: ${img}`);
}

/* Navigation is real links, so it works before (and without) the shell. */
for (const app of ['about', 'projects', 'experience', 'stack', 'contact', 'terminal']) {
  assert.ok(homepage.includes(`<a class="launcher" href="#${app}" data-launch="${app}">`),
    `sidebar entry for ${app} must be a link`);
  assert.ok(homepage.includes(`<a class="dock__item" href="#${app}" data-launch="${app}">`),
    `phone navigation entry for ${app} must be a link`);
}
assert.ok(!/<button[^>]*class="launcher"/.test(homepage), 'launchers must not be inert buttons');
assert.match(script, /if \(e\.metaKey \|\| e\.ctrlKey \|\| e\.shiftKey \|\| e\.button !== 0\) return;/,
  'modified clicks on navigation links must fall through to the browser');

/* Ids are unique (the window and its terminal surface once collided). */
const ids = [...homepage.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
assert.equal(new Set(ids).size, ids.length, `duplicate id: ${ids.find((v, i) => ids.indexOf(v) !== i)}`);

/* ------------------------------------------- the profile window (stage 4) */

/* The portrait is an application, not decoration: it auto-opens beside the
   terminal, and the sidebar card is that same window collapsed. */
assert.match(homepage, /<section class="win" id="profile" data-app="profile"/, 'profile window missing');
for (const line of [
  'images/avatar-320.jpg',
  content.roleLine,
  'available for interesting problems',
  'Cornell Tech · CS, MEng \'27',
  'Cornell University · CS &amp; Economics, \'22'
]) {
  assert.ok(homepage.includes(line), `profile window missing: ${line}`);
}
/* Its quick links are the real ones, not a second set of strings to drift. */
for (const href of ['/files/Terence_Zhang_Resume.pdf', 'https://github.com/TerenceZhang29',
  'mailto:hz467@cornell.edu']) {
  const win = homepage.slice(homepage.indexOf('id="profile"'), homepage.indexOf('id="terminal"'));
  assert.ok(win.includes(href), `profile quick links missing: ${href}`);
}

/* The card is the collapsed state: a link into the window, hidden while it is open. */
assert.match(homepage, /<a class="sidebar__card" href="#profile" data-launch="profile">/,
  'the sidebar card must be the profile launcher');
assert.match(script, /profileCard\.hidden = !!\(profile && profile\.open && !profile\.min\)/,
  'the card must collapse/expand with the profile window');
assert.match(styles, /\.sidebar__card\[hidden\] \{ display: none; \}/,
  'the card sets its own display, so it needs an explicit hidden rule');

/* Landing desktop: terminal + profile. about.txt is no longer auto-opened. */
const boot = script.slice(script.indexOf('function bootDefaults'), script.indexOf('function initLaunchers'));
assert.ok(boot.includes("open('profile'"), 'profile should open on landing');
assert.ok(boot.includes("open('terminal'"), 'terminal should open on landing');
assert.ok(!boot.includes("open('about'"), 'about.txt should no longer auto-open');
assert.ok(boot.includes('isPhone()'), 'phones need their own landing arrangement');
assert.match(script, /profile: function \(\) \{ open\('profile'\)/, 'terminal profile command missing');

/* Phone navigation carries all seven applications. */
const mobilenav = homepage.slice(homepage.indexOf('class="mobilenav"'), homepage.indexOf('</nav>', homepage.indexOf('class="mobilenav"')));
const navLinks = [...mobilenav.matchAll(/<a class="dock__item"/g)].length;
assert.equal(navLinks, 7, 'phone navigation should list every application');
assert.ok(mobilenav.includes('data-launch="profile"'), 'phone navigation missing the profile');

/* The portrait is sized for its slot, like the card thumbnail before it. */
assert.ok(fs.statSync('images/avatar-320.jpg').size < 60000, 'portrait should stay a light asset');

/* Touch targets on phones. */
assert.match(styles, /\.win__control::before \{ content: ""; inset: -1rem;/, 'phone close control needs a real hit area');

/* ------------------------------------------------ large screens (stage 5) */

/* One scale for the whole interface: 16px at the 1440×900 reference, never smaller,
   up to 1.6× on large monitors. Everything else is rem so it follows this value. */
assert.match(styles, /html \{ font-size: clamp\(16px, min\(1\.1111vw, 1\.7778vh\), 25\.6px\); \}/,
  'root scale missing, or its floor/cap changed');

/* Only values that must not scale may stay in px: 0–2px hairlines and outlines,
   media-query breakpoints, and the scale declaration itself. */
{
  const code = styles.replace(/\/\*[\s\S]*?\*\//g, '');
  const stray = [];
  code.split('\n').forEach((line) => {
    for (const value of line.match(/-?\d*\.?\d+px/g) || []) {
      if (/^-?[012]px$/.test(value)) continue;
      if (/^\s*@media/.test(line)) continue;
      if (/^html \{ font-size: clamp/.test(line)) continue;
      stray.push(`${value} in "${line.trim()}"`);
    }
  });
  assert.deepEqual(stray, [], 'px values that will not scale on large screens');
}

/* JS window geometry follows the same scale: layout runs in design units and is
   converted only when written. */
assert.match(script, /function readScale\(\) \{\s*scale = \(parseFloat\(getComputedStyle\(document\.documentElement\)\.fontSize\) \|\| 16\) \/ 16;/,
  'readScale must derive the scale from the root font size os.css sets');
assert.match(script, /function px\(designUnits\) \{ return Math\.round\(designUnits \* scale\); \}/);
assert.match(script, /readScale\(\);\s*document\.querySelectorAll\('\.win'\)\.forEach\(build\);/, 'scale must be known before windows are built');
{
  const place = script.slice(script.indexOf('function place(rec)'), script.indexOf('function open(app'));
  assert.match(place, /var maxW = workspace\.clientWidth \/ scale;/, 'place() must measure the workspace in design units');
  assert.match(place, /width: px\(w\) \+ 'px', height: px\(h\) \+ 'px', left: px\(x\) \+ 'px', top: px\(y\) \+ 'px'/, 'place() must write real px');
}
{
  const boot = script.slice(script.indexOf('function bootDefaults'), script.indexOf('function initLaunchers'));
  assert.match(boot, /var W = workspace\.clientWidth \/ scale;/, 'boot layout must run in design units');
  assert.match(boot, /var x0 = Math\.max\(left, Math\.round\(\(W - \(tw \+ gap \+ pw\)\) \/ 2\)\);/, 'the boot pair must be centred, never over the shortcuts');
  assert.match(boot, /x: Math\.max\(left, Math\.round\(\(W - tw1\) \/ 2\)\)/, 'the single-terminal fallback must be centred too');
}

/* Default window positions shift to the centre of larger desktops, never left or up. */
assert.match(script, /var DESIGN_DESKTOP = \{ w: 1230, h: 866 \};/);
assert.match(script, /var dx = rec\.centred \? 0 : Math\.max\(0, Math\.round\(\(maxW - DESIGN_DESKTOP\.w\) \/ 2\)\);/);
assert.match(script, /var dy = rec\.centred \? 0 : Math\.max\(0, Math\.round\(\(maxH - DESIGN_DESKTOP\.h\) \/ 2\)\);/);

/* Scale changes at runtime (resize, moving monitors) keep open windows in proportion. */
assert.match(script, /var previous = scale;\s*readScale\(\);\s*if \(Math\.abs\(scale - previous\) > 0\.001 && !isPhone\(\)\)/,
  'windows must follow a scale change instead of jumping');

/* Drag/resize limits are scaled so they match the rem sizes in os.css. */
assert.match(script, /Math\.max\(px\(300\), /, 'minimum window width must scale with .win min-width');
assert.match(styles, /min-width: 18\.75rem;/, '.win min-width (300px at the reference scale)');

console.log('os view test: PASS');
