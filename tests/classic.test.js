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
const content = require('./content');

const page = fs.readFileSync('classic.html', 'utf8');
const styles = fs.readFileSync('assets/css/main.css', 'utf8');

/* ---------------------------------------------------------- content kept */

/* The traditional page writes the same dates as prose: Sep 2025 — Feb 2026. */
const entries = page.split('<article class="timeline-item">').slice(1);
assert.equal(entries.length, content.roles.length, 'one timeline entry per role');
content.roles.forEach((role, i) => {
  const entry = entries[i];
  const facts = [role.title, role.employer, role.url, role.location,
    `${content.monthLabel(role.from)} — ${content.monthLabel(role.to)}`, role.focus, role.summary];
  for (const fact of facts) {
    assert.ok(entry.includes(content.html(fact)), `timeline entry ${i + 1} (${role.employer}) missing: ${fact}`);
  }
  if (role.note) assert.ok(entry.includes(role.note), `traditional view missing employer note: ${role.note}`);
  for (const tag of role.tags) {
    assert.ok(entry.includes(`<li>${tag}</li>`), `${role.employer} entry missing tag: ${tag}`);
  }
});
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

assert.ok(page.includes(`<p class="eyebrow">${content.roleLine}</p>`),
  'traditional view role line missing or reordered');
assert.ok(page.includes(`<meta name="description" content="${content.description}" />`),
  'traditional view meta description missing or reworded');
assert.ok(page.includes(`<h1 id="hero-title">${content.slogan.lead}<br /><em>${content.slogan.accent}</em></h1>`),
  'traditional view hero slogan missing or reworded');

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
  'the template hides h1 <br>s below 980px, fusing the two hero lines into one unbreakable word');
assert.match(styles, /\.portfolio-page \.button \{[^}]*height: auto;[^}]*line-height: inherit;/,
  "the template's fixed-height .button clips its text once padding is added");

/* The Sneaker Room is unlisted here too, matching the OS view: /sneakers.html stays
   published and keeps its own link back, but neither view advertises it. */
assert.ok(!page.includes('/sneakers.html'), 'the traditional view must not link to the Sneaker Room');

/* The page began as the newlook branch's index.html and was compared byte-for-byte
   against it. That guard has been retired: the employment facts have since been
   corrected in both views, so the branch is no longer the source of truth. What
   replaces it is stronger where it counts — every fact both views must carry lives in
   tests/content.js and is asserted against both pages, and the structural checks above
   cover the page's own wiring. */

/* No role is current any more: the timeline must not claim one. */
assert.ok(!page.includes('timeline-item current'), 'the Vicino entry is no longer the current role');
assert.ok(!page.includes('current-label'), 'the "Current" badge should be gone');
assert.ok(!/\d{4} — now/.test(page), 'no open-ended date range remains');

/* ------------------------------------------------------- never redirects */

const inline = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
assert.equal(inline, '', 'the traditional view has no inline scripts, so nothing on it can redirect');
assert.ok(!/location\.(replace|assign)|location\.href\s*=/.test(page), 'the traditional view must never redirect');

console.log('classic view test: PASS');
