/* Homepage test for terenceOS.
 *
 * Two jobs:
 *   1. nothing from the previous portfolio was lost in the redesign
 *      (every role, project, link, credential and file is still on the page);
 *   2. the OS shell is wired up — one Window primitive, a launcher, a dock,
 *      a terminal, deep links, and a phone layout that does not overflow.
 *
 * Run with: node tests/homepage.test.js
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');

const homepage = fs.readFileSync('index.html', 'utf8');
const styles = fs.readFileSync('assets/css/os.css', 'utf8');
const script = fs.readFileSync('assets/js/os.js', 'utf8');
const sneakers = fs.readFileSync('sneakers.html', 'utf8');

/* ---------------------------------------------------------- content kept */

for (const role of ['Vicino AI', 'Bili Technology', 'Amazon', 'Millennium Management']) {
  assert.ok(homepage.includes(role), `missing experience: ${role}`);
}
for (const title of [
  'AI Research Engineer',
  'Senior Software Development Engineer',
  'Software Development Engineer II',
  'Automation Developer Intern'
]) {
  assert.ok(homepage.includes(title), `missing job title: ${title}`);
}
for (const span of ['2024 → PRESENT', '2023 → 2024', '2022 → 2023', '2021 → 2022']) {
  assert.ok(homepage.includes(span), `missing date range: ${span}`);
}

for (const project of ['Vicino AI Image Editor', 'Rent Calculator', 'Clubby']) {
  assert.ok(homepage.includes(project), `missing project: ${project}`);
}
for (const link of [
  'https://apps.shopline.com/detail?appHandle=public_image_editor',
  'https://rent-calculator-gray.vercel.app/',
  'https://vicino.ai/',
  'https://duedash.com/dd/bilitechnologyinc',
  'https://www.amazon.com/',
  'https://www.mlp.com/',
  'https://github.com/TerenceZhang29',
  'https://www.linkedin.com/in/terence-hantian-zhang/',
  'mailto:terencezhang829@gmail.com',
  '/files/Terence_Zhang_Resume.pdf'
]) {
  assert.ok(homepage.includes(link), `missing link: ${link}`);
}

for (const fact of [
  'Cornell University',
  'CS &amp; Economics · \'22',
  'Cornell Tech',
  'CMSX · Cup Robotics · CIS Teaching Assistant',
  'Omicron Delta Epsilon · Dean\'s List',
  'Enterprise AI Marketing Platform',
  'version control infrastructure for AI agent collaboration',
  'billion-scale distributed systems for digital asset',
  'images/avatar-96.jpg'
]) {
  assert.ok(homepage.includes(fact), `missing biography detail: ${fact}`);
}

/* Existing anchors still resolve, so old inbound links keep working. */
for (const id of ['top', 'about', 'experience', 'projects', 'contact']) {
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
assert.ok(!homepage.includes('win__bar'), 'window chrome must be built by the manager, not the markup');
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
assert.match(homepage, /id="terminal-input"/, 'terminal input missing');

/* --------------------------------------------------------------- design */

for (const token of ['#080B0F', '#0D1116', '#11161A', '#151A1F', '#232A31', '#303841',
  '#E6E6E6', '#A1A7AE', '#6B7280', '#4B5259', '#A3E635', '#60A5FA', '#C084FC']) {
  assert.ok(styles.includes(token), `missing palette token: ${token}`);
}
for (const family of ['Geist', 'Geist+Mono', 'Inter']) {
  assert.ok(homepage.includes(family), `missing font family: ${family}`);
}
assert.match(styles, /--radius: 8px;/, 'window radius token missing');
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
const external = scriptTags.filter((t) => t.includes('src='));
assert.equal(external.length, 1, 'the page should load exactly one external script');
assert.ok(external[0].includes('assets/js/os.js'), 'no third-party libraries');
assert.ok(!/setInterval/.test(script), 'no continuously running timers');
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
  'AI research engineer · software engineer',
  'available for interesting problems',
  'Cornell Tech · Computer Science, MEng \'27',
  'Cornell University · CS &amp; Economics, \'22'
]) {
  assert.ok(homepage.includes(line), `profile window missing: ${line}`);
}
/* Its quick links are the real ones, not a second set of strings to drift. */
for (const href of ['/files/Terence_Zhang_Resume.pdf', 'https://github.com/TerenceZhang29',
  'mailto:terencezhang829@gmail.com']) {
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
assert.match(styles, /\.win__control::before \{ content: ""; inset: -16px;/, 'phone close control needs a real hit area');

console.log('homepage test: PASS');
