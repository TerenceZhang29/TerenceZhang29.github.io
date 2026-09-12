/* Traditional view test (classic.html).
 *
 * Three jobs:
 *   1. the traditional view carries every fact in tests/content.js — the same
 *      list the OS view is checked against;
 *   2. it is the newlook branch's page, kept as-is apart from the additions this
 *      project agreed to (a canonical tag, the return link, the shared script);
 *   3. it can never redirect: only index.html redirects, so the views cannot loop.
 *
 * Run with: node tests/run.js   (or on its own: node tests/classic.test.js)
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execSync } = require('node:child_process');
const content = require('./content');

const page = fs.readFileSync('classic.html', 'utf8');
const styles = fs.readFileSync('assets/css/main.css', 'utf8');

/* ---------------------------------------------------------- content kept */

/* The traditional view writes an open-ended range as "— now". */
const classicRange = (role) => `${role.from} — ${role.to === null ? 'now' : role.to}`;

for (const role of content.roles) {
  for (const fact of [role.title, role.employer, role.url, role.focus, classicRange(role)]) {
    assert.ok(page.includes(fact), `traditional view missing ${role.employer} detail: ${fact}`);
  }
}
for (const project of content.projects) {
  for (const fact of [project.name, project.image, project.url].filter(Boolean)) {
    assert.ok(page.includes(fact), `traditional view missing project detail: ${fact}`);
  }
}
for (const fact of [...content.links, ...content.biography]) {
  assert.ok(page.includes(fact), `traditional view missing: ${fact}`);
}
for (const id of content.sharedAnchors) {
  assert.match(page, new RegExp(`id="${id}"`), `traditional view missing #${id}, which the redirect carries across`);
}

/* ---------------------------------------------------- its own source */

assert.match(page, /<html lang="en" class="portfolio-root">/, 'main.css is scoped to html.portfolio-root');
assert.match(page, /<body class="portfolio-page">/, 'main.css is scoped to body.portfolio-page');
assert.match(page, /<link rel="stylesheet" href="assets\/css\/main\.css" \/>/, 'traditional stylesheet missing');
assert.ok(!page.includes('assets/css/os.css'), 'the OS stylesheet must not leak into this view');
assert.ok(!page.includes('assets/js/os.js'), 'the OS script must not leak into this view');

const scripts = [...page.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
assert.deepEqual(scripts, ['assets/js/view.js', 'assets/js/scale.js'], 'only the shared view module and its own scaler');

/* ------------------------------------------- agreed additions, nothing else */

assert.match(page, /<link rel="canonical" href="https:\/\/terencezhang\.is-a\.dev\/" \/>/, 'canonical tag missing');
assert.match(page, /<a class="header-view" href="index\.html\?view=os">terenceOS <span aria-hidden="true">↗<\/span><\/a>/,
  'the way back to the OS view is missing, or no longer works without JavaScript');
assert.match(styles, /\.portfolio-page \.header-view \{/, 'return link has no styling of its own');
/* Two branch bugs, both caused by the old template CSS still in main.css, are
   fixed in CSS only (so the markup stays as-is). Keep them fixed. */
assert.match(styles, /\.portfolio-page h1 br \{ display: inline; \}/,
  'the template hides h1 <br>s below 980px, fusing "usefulintelligence." and overflowing phones');
assert.match(styles, /\.portfolio-page \.button \{[^}]*height: auto;[^}]*line-height: inherit;/,
  "the template's fixed-height .button clips its text once padding is added");

/* Decision: the branch page is kept as-is, Sneaker Room link included. */
assert.ok(page.includes('/sneakers.html'), 'the traditional page keeps its Sneaker Room link');

/* Compare with the branch it came from. Skipped (not failed) where the branch
   is not available, e.g. a shallow CI clone. */
let branch = null;
try {
  branch = execSync('git show newlook:index.html', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
} catch (e) {
  console.log('classic view test: newlook branch unavailable, skipping the as-is comparison');
}
if (branch !== null) {
  const additions = [
    /^\t<link rel="canonical"[^\n]*\n/m,
    /^\t\t<a class="header-view"[^\n]*\n/m,
    /^\t<script src="assets\/js\/view\.js"><\/script>\n/m
  ];
  const stripped = additions.reduce((html, re) => html.replace(re, ''), page);
  assert.equal(stripped, branch, 'classic.html has drifted from the newlook branch beyond the agreed additions');
}

/* ------------------------------------------------------- never redirects */

const inline = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
assert.equal(inline, '', 'the traditional view has no inline scripts, so nothing on it can redirect');
assert.ok(!/location\.(replace|assign)|location\.href\s*=/.test(page), 'the traditional view must never redirect');

console.log('classic view test: PASS');
