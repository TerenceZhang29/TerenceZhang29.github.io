/* Amazon project pages test (amazon-*.html, linked from classic.html).
 *
 * Five jobs:
 *   1. the traditional view's "At Amazon" row links to every project page, and
 *      each card's numbers are ones its page actually states;
 *   2. each page is wired like the traditional view (its stylesheets and
 *      scaler, no OS assets, no inline scripts, never redirects) and links back
 *      to the projects section and on to the next project;
 *   3. every diagram is intact: arrowheads resolve to markers on the same page,
 *      and each numbered marker has its written explanation (and vice versa);
 *   4. terenceOS carries the same write-ups: an amazon/ group in its projects
 *      window, and one window per project whose content is the page's, word
 *      for word, so the two views cannot drift;
 *   5. no Amazon-internal names leak onto the public site. The write-ups were
 *      translated from internal design docs; this list is what was translated.
 *
 * Run with: node tests/run.js   (or on its own: node tests/amazon.test.js)
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');

const classic = fs.readFileSync('classic.html', 'utf8');
const PAGES = ['amazon-source.html', 'amazon-takedown.html', 'amazon-compression.html'];

/* --------------------------------------------------- linked from classic */

const projects = classic.slice(classic.indexOf('id="projects"'), classic.indexOf('two-column-section'));
assert.ok(projects.includes('<p class="project-group"><span>At Amazon · 2022–2025</span></p>'), 'the "At Amazon" row label is missing');
assert.ok(projects.includes('<p class="project-group"><span>Personal projects</span></p>'), 'the personal projects row label is missing');
assert.ok(projects.indexOf('At Amazon') < projects.indexOf('Personal projects'), 'Amazon work is listed before personal projects');

const cards = [...projects.matchAll(/<article class="project-card"><a href="(amazon-[a-z]+\.html)">([\s\S]*?)<\/article>/g)];
assert.deepEqual(cards.map((m) => m[1]), PAGES, 'one card per project page, in order');

for (const [, file, card] of cards) {
  const page = fs.readFileSync(file, 'utf8');
  const figures = [...card.matchAll(/<dd>([^<]+)<\/dd>/g)].map((m) => m[1]);
  assert.equal(figures.length, 3, `${file} card shows three numbers`);
  for (const figure of figures) {
    assert.ok(page.includes(figure), `${file} card claims "${figure}", which its page never states`);
  }
}

/* ------------------------------------------------------- each page's wiring */

PAGES.forEach((file, i) => {
  const page = fs.readFileSync(file, 'utf8');

  assert.match(page, /<html lang="en" class="portfolio-root">/, `${file}: main.css is scoped to html.portfolio-root`);
  assert.match(page, /<body class="portfolio-page work-page" id="top">/, `${file}: body classes`);
  assert.match(page, /<link rel="stylesheet" href="assets\/css\/main\.css" \/>\s*<link rel="stylesheet" href="assets\/css\/project\.css" \/>/,
    `${file}: main.css, then project.css`);
  assert.ok(!page.includes('assets/css/os.css') && !page.includes('assets/js/os.js'), `${file}: no OS assets`);
  assert.match(page, new RegExp(`<link rel="canonical" href="https://terencezhang\\.is-a\\.dev/${file.replace('.', '\\.')}" />`),
    `${file}: canonical points at itself`);

  const scripts = [...page.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  assert.deepEqual(scripts, ['assets/js/scale.js', 'assets/js/project.js'], `${file}: only the scaler and the page script`);
  const inline = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('');
  assert.equal(inline, '', `${file}: no inline scripts`);
  assert.ok(!/location\.(replace|assign)|location\.href\s*=/.test(page), `${file}: never redirects`);

  assert.ok(page.includes('<a class="work-crumb" href="classic.html#projects">← All projects</a>'), `${file}: link back to the projects`);
  assert.match(page, new RegExp(`<a class="header-view" href="index\\.html\\?view=os#project-${file.slice(0, -5)}">terenceOS`),
    `${file}: the way into terenceOS opens this write-up's window`);
  const next = PAGES[(i + 1) % PAGES.length];
  assert.match(page, new RegExp(`<nav class="work-next"[\\s\\S]*?<a href="${next.replace('.', '\\.')}">`), `${file}: next project is ${next}`);

  /* Diagrams. */
  const ids = new Set([...page.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  for (const [, ref] of page.matchAll(/url\(#([^)]+)\)/g)) {
    assert.ok(ids.has(ref), `${file}: arrowhead #${ref} has no marker on this page`);
  }
  const svgMarks = [...page.matchAll(/<g class="co" data-co="(\d)"/g)].map((m) => m[1]).sort();
  const written = [...page.matchAll(/<li data-co="(\d)"/g)].map((m) => m[1]).sort();
  assert.ok(svgMarks.length > 0, `${file}: diagram has numbered markers`);
  assert.deepEqual(written, svgMarks, `${file}: every numbered marker has its explanation, and no extras`);
  assert.match(page, /data-callouts/, `${file}: project.js finds the callouts by data-callouts`);
});

/* ------------------------------------------------------------ in terenceOS */

const homepage = fs.readFileSync('index.html', 'utf8');
const osScript = fs.readFileSync('assets/js/os.js', 'utf8');
const WINDOWS = PAGES.map((f) => f.replace('amazon-', 'project-amazon-').replace('.html', ''));
const squash = (html) => html.replace(/\s+/g, ' ').trim();

assert.match(homepage, /<link rel="stylesheet" href="assets\/css\/os\.css" \/>\s*<link rel="stylesheet" href="assets\/css\/project\.css" \/>/,
  'index.html: os.css, then project.css');

const fileList = homepage.slice(homepage.indexOf('<ul class="filelist">'), homepage.indexOf('</ul>', homepage.indexOf('<ul class="filelist">')));
assert.ok(fileList.indexOf('<li class="filelist__group"><span><svg class="icon"><use href="#i-folder" /></svg>amazon/</span></li>') === fileList.indexOf('<li'), 'the projects window opens with the amazon/ group');
assert.ok(fileList.indexOf('amazon/</li>') < fileList.indexOf('<li class="filelist__group"><span><svg class="icon"><use href="#i-folder" /></svg>personal/</span></li>'), 'amazon/ is listed before personal/');
const rows = [...fileList.matchAll(/data-launch="(project-amazon-[a-z]+)">\s*<span class="file-row__thumb file-row__thumb--stat"><b>([^<]+)<\/b>/g)];
assert.deepEqual(rows.map((m) => m[1]), WINDOWS, 'one projects-window row per Amazon window, in order');

const ids = [...homepage.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), [], 'index.html: ids are unique across all three write-ups');

WINDOWS.forEach((app, i) => {
  const file = PAGES[i];
  const page = fs.readFileSync(file, 'utf8');
  const start = homepage.indexOf(`<section class="win" id="${app}" data-app="${app}" `);
  assert.ok(start > 0, `index.html: window ${app}`);
  const win = homepage.slice(start, homepage.indexOf('</section>\n\n', homepage.indexOf('<nav class="work-onward"', start)));

  const title = page.match(/<h1 id="([^"]+)"/)[1];
  assert.match(win, new RegExp(`aria-labelledby="${title}" hidden>`), `${app}: labelled by its write-up's title`);
  assert.ok(win.startsWith(`<section class="win" id="${app}" data-app="${app}" data-page="${file}" `),
    `${app}: switching to the traditional view from this window lands on ${file}`);
  assert.ok(win.includes(rows[i][2]), `${app}: its projects-window row claims "${rows[i][2]}", which the window never states`);

  const ours = win.slice(win.indexOf('<div class="work-page">') + '<div class="work-page">'.length, win.lastIndexOf('</div>', win.indexOf('<nav class="work-onward"')));
  const theirs = page.slice(page.indexOf('<section class="work-hero"'), page.indexOf('<nav class="work-next"'));
  assert.equal(squash(ours), squash(theirs), `${app}: write-up differs from ${file}`);

  assert.ok(win.includes(`data-launch="${WINDOWS[(i + 1) % WINDOWS.length]}">Next at Amazon:`), `${app}: next project is ${WINDOWS[(i + 1) % WINDOWS.length]}`);
  assert.ok(win.includes(`<a class="linkbtn" href="${file}" target="_blank" rel="noopener">Open as a page`), `${app}: links to ${file}`);
  assert.match(osScript, new RegExp(`\\{ id: '${app}', name: '[^']+', sub: '[^']+', icon: 'i-box', group: 'Projects'`), `${app}: in the command palette`);
});

/* ---------------------------------------------------- no internal names */

const INTERNAL = [
  'Wharf', 'MediaX', 'Media Experience', 'AutoMunger', 'Automunger', 'Rouleur', 'MAOS', 'Goldfinch',
  'Media Central', 'Content Symphony', 'Swifter', 'Weblab', 'MCM', 'pips-orig', 'Physical Object',
  'PhysicalId', 'GeneralMediaOU', 'Coral', 'Flamel', 'Merlin', 'PixelPusher', 'Andes', 'MediaCollections'
];
for (const file of ['classic.html', 'index.html', 'assets/js/os.js', ...PAGES]) {
  const page = fs.readFileSync(file, 'utf8');
  for (const term of INTERNAL) {
    assert.ok(!page.includes(term), `${file} mentions the internal name "${term}"`);
  }
  assert.ok(!/\bHub\b/.test(page), `${file} mentions the internal service "Hub"`);
}

console.log('amazon pages test: PASS');
