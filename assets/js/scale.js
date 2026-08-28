/* Resolution-independent scaling for the portfolio homepage.
 *
 * The layout is authored once against a 1600x900 reference where 1rem = 16px,
 * and every dimension in the .portfolio-page block is expressed in rem. Scaling
 * the root font-size therefore scales the whole composition uniformly, so the
 * page keeps identical proportions at any resolution.
 *
 * main.css already does this with `clamp(9px, min(1vw, 1.7778vh), 28px)`, which
 * is the no-JS default. This script recomputes the same value from the live
 * clientWidth/clientHeight, which exclude the classic scrollbar that vw/vh
 * include -- worth up to ~17px of viewport on Windows and Linux.
 */
(function () {
	'use strict';

	var REF_WIDTH = 1600;
	var REF_HEIGHT = 900;
	var REF_ROOT = 16;
	var MIN_ROOT = 9;
	var MAX_ROOT = 28;
	var MOBILE_MAX = 700; /* must match the max-width: 700px branch in main.css */

	var root = document.documentElement;

	function apply() {
		var width = root.clientWidth;
		var height = root.clientHeight;

		if (!width || !height) return;

		/* Full-bleed sections use this instead of 100vw, which counts the
		   classic scrollbar and would push a horizontal scrollbar onto the page. */
		root.style.setProperty('--viewport-width', width + 'px');

		if (width <= MOBILE_MAX) {
			/* Phones use their own stacked layout, pinned at 16px so its rem
			   values keep their authored meaning and do not jitter as mobile
			   browsers show and hide the URL bar. */
			root.style.fontSize = '';
			return;
		}

		var size = Math.min(width / REF_WIDTH, height / REF_HEIGHT) * REF_ROOT;
		root.style.fontSize = Math.min(MAX_ROOT, Math.max(MIN_ROOT, size)) + 'px';
	}

	var queued = false;

	function schedule() {
		if (queued) return;
		queued = true;
		window.requestAnimationFrame(function () {
			queued = false;
			apply();
		});
	}

	apply();
	window.addEventListener('resize', schedule);
	window.addEventListener('orientationchange', schedule);
})();
