const assert = require('node:assert/strict');
const fs = require('node:fs');

const homepage = fs.readFileSync('index.html', 'utf8');
const homepageStyles = fs.readFileSync('assets/css/main.css', 'utf8');
const sneakerStyles = fs.readFileSync('s_assets/css/main.css', 'utf8');

for (const id of ['top', 'about', 'experience', 'projects', 'contact']) {
  assert.match(homepage, new RegExp(`id="${id}"`), `missing #${id}`);
}

for (const role of ['Vicino AI', 'Bili Technology', 'Amazon', 'Millennium Management']) {
  assert.ok(homepage.includes(role), `missing experience: ${role}`);
}

assert.match(homepage, /class="timeline"/);
assert.match(homepage, /class="project-grid"/);
assert.match(homepage, /class="portfolio-page"/);
assert.match(homepage, /class="button primary"/);
assert.equal((homepage.match(/class="project-card/g) || []).length, 3, 'all three projects should remain present');
assert.ok(!homepage.includes('style='), 'homepage should not use inline styles');

for (const family of ['Inter', 'JetBrains+Mono', 'Manrope']) {
  assert.ok(homepage.includes(family), `missing font family: ${family}`);
}

for (const token of ['#FAFAF8', '#FFFFFF', '#18181B', '#52525B', '#71717A', '#E4E4E7', '#2563EB', '#1D4ED8', '#7C3AED', '#EFF6FF']) {
  assert.ok(homepageStyles.includes(token), `missing homepage color token: ${token}`);
}

for (const legacyToken of ['--portfolio-coral', '--portfolio-teal', '--portfolio-sand', 'DM Sans', 'Fraunces']) {
  assert.ok(!homepageStyles.includes(legacyToken), `legacy homepage theme token remains: ${legacyToken}`);
}

assert.match(homepageStyles, /\.portfolio-page \.project-card:hover/);
assert.match(homepageStyles, /@media screen and \(max-width: 700px\)/);
// Resolution-independent scaling: one root font-size drives the whole layout.
assert.match(homepageStyles, /html\.portfolio-root \{\s*font-size: clamp\(9px, min\(1vw, 1\.7778vh\), 28px\);/);
assert.match(homepageStyles, /--viewport-width: 100vw;/);
assert.match(homepageStyles, /--content-max: 84rem;/);
assert.match(homepageStyles, /--gutter: 4rem;/);
assert.match(homepage, /<html lang="en" class="portfolio-root">/);
assert.match(homepage, /<script src="assets\/js\/scale\.js"><\/script>/);
assert.ok(!homepage.includes('assets/js/main.js'), 'dead jQuery bundle should no longer be loaded');

// Every layout dimension is rem so it follows the root font-size.
assert.match(homepageStyles, /\.portfolio-page main \{ margin: 0 auto; max-width: var\(--content-max\); padding: 0 var\(--gutter\); width: 100%; \}/);
assert.match(homepageStyles, /\.portfolio-page h1 \{ font-size: 5\.2rem;/);
assert.match(homepageStyles, /\.portfolio-page h2 \{ font-size: 2\.25rem;/);
assert.match(homepageStyles, /\.portfolio-page \.hero \{ align-items: center; display: grid; gap: 5rem; grid-template-columns: minmax\(0, 1fr\) 18rem; min-height: calc\(100vh - 4\.625rem\); padding: 10rem 0; \}/);
// The header and the full-bleed contact band must use the SAME gutter expression as
// each other; that shared formula is what keeps their contents on the content-column edge.
const GUTTER_EXPR = 'max(var(--gutter), calc((var(--viewport-width) - var(--content-max)) / 2 + var(--gutter)))';
assert.ok(homepageStyles.includes(`padding: 0 ${GUTTER_EXPR}; position: sticky`), 'header should align to the content column');
assert.ok(homepageStyles.includes(`padding: 8rem ${GUTTER_EXPR}`), 'contact band should align to the content column');
assert.match(homepageStyles, /grid-template-columns: 8\.125rem minmax\(0, 1fr\)/);
assert.match(homepageStyles, /height: 3rem; justify-content: center; width: 3rem/);
assert.match(homepageStyles, /max-width: var\(--content-max\); padding: 2rem var\(--gutter\); \}/);
assert.match(homepageStyles, /margin-inline: calc\(50% - var\(--viewport-width\) \/ 2\)/);

// No hardcoded px left in the portfolio block except 1px hairlines and shadows.
// Scanned across the desktop rules only; the mobile branch is pinned at 16px
// and keeps its authored px values on purpose.
const desktopBlock = homepageStyles.slice(
  homepageStyles.indexOf('/* Portfolio page */'),
  homepageStyles.indexOf('@media screen and (max-width: 700px)')
);
const HAIRLINES = ['1px', '2px', '8px', '20px']; // borders and box-shadow offsets
const strayPx = [...desktopBlock.matchAll(/-?\d*\.?\d+px/g)]
  .map((m) => m[0])
  .filter((v) => !HAIRLINES.includes(v));
assert.deepEqual(strayPx, [], `unscaled px remain in the portfolio block: ${strayPx.join(', ')}`);
assert.ok(!desktopBlock.includes('95rem'), 'the content column should come from --content-max, not a hardcoded width');

// The mid-width branch that replaced the design is gone; mobile survives intact.
assert.ok(!homepageStyles.includes('(min-width: 701px)'), 'mid-width layout branch should be removed');
assert.ok(!homepageStyles.includes('max-width: 1599px'), 'obsolete laptop breakpoint remains');
assert.ok(!homepageStyles.includes('max-width: 1199px'), 'obsolete laptop breakpoint remains');
assert.ok(!homepageStyles.includes('max-width: 1799px'), 'obsolete laptop breakpoint remains');
assert.match(homepageStyles, /@media screen and \(max-width: 700px\) \{\s*html\.portfolio-root \{ font-size: 16px;/);
assert.match(homepageStyles, /\.portfolio-page h1 \{ font-size: clamp\(40px, 12vw, 48px\)/);
assert.match(homepageStyles, /\.portfolio-page \.hero-aside img \{ height: 96px; margin: 0; width: 96px; \}/);
// The desktop .contact-email is a flat 2.4rem, so the phone branch must size it
// explicitly -- it used to lean on the lower bound of a clamp() and overflowed without this.
assert.match(homepageStyles, /\.portfolio-page \.contact-email \{ font-size: 1\.3rem; max-width: 100%; overflow-wrap: anywhere; \}/);
assert.match(homepageStyles, /\.portfolio-page \.hero-copy, \.portfolio-page \.hero-aside \{ text-align: center; width: 100%; \}/);
assert.match(homepageStyles, /\.portfolio-page \.hero \{ align-items: center; display: flex; flex-direction: column; gap: clamp\(1\.5rem, 6vw, 2\.25rem\); min-height: 0; padding: clamp\(3rem, 10vw, 4\.5rem\) 0; text-align: center; \}/);

assert.match(sneakerStyles, /family=Inter/);
assert.match(sneakerStyles, /family=JetBrains\+Mono/);
assert.match(sneakerStyles, /family=Manrope/);
assert.match(sneakerStyles, /\/\* Shared warm off-white theme \*\//);

const images = [...homepage.matchAll(/<img\b/g)].length;
const altText = [...homepage.matchAll(/<img\b[^>]*\balt="[^"]+"/g)].length;
assert.equal(images, altText, 'every homepage image needs non-empty alt text');

console.log('homepage test: PASS');
