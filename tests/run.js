/* Runs every test suite. Each suite throws on its first failure.
 *
 *   tests/os.test.js       terenceOS view (index.html)
 *   tests/classic.test.js  traditional view (classic.html)
 *   tests/view.test.js     switching between them (assets/js/view.js)
 *   tests/transition.test.js  the shutdown/boot animation between them (assets/js/transition.js)
 *   tests/amazon.test.js   the Amazon project pages the traditional view links to (amazon-*.html)
 *
 * Both view suites check their page against tests/content.js.
 *
 * Run from the repo root: node tests/run.js
 */
const path = require('node:path');

process.chdir(path.join(__dirname, '..'));

for (const suite of ['os.test.js', 'classic.test.js', 'view.test.js', 'transition.test.js', 'amazon.test.js']) {
  require(path.join(__dirname, suite));
}
