/* ============================================================================
   Amazon project pages (amazon-*.html).
   ----------------------------------------------------------------------------
   Two small behaviours, both optional: without JavaScript every callout and
   chart is still fully readable.

   1. Callouts. Each architecture diagram has numbered markers, and a list of
      the same numbers below it. Choosing either highlights the pair.
   2. Chart detail. Marks with a data-tip attribute show it on hover.
   ========================================================================= */
(function () {
	'use strict';

	document.querySelectorAll('[data-callouts]').forEach(function (section) {
		var items = Array.prototype.slice.call(section.querySelectorAll('[data-co]'));

		function pick(n) {
			items.forEach(function (el) { el.classList.toggle('is-on', el.getAttribute('data-co') === n); });
		}

		items.forEach(function (el) {
			var n = el.getAttribute('data-co');
			el.addEventListener('click', function () { pick(n); });
			el.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					pick(n);
				}
			});
		});
		pick('1');
	});

	var tip = document.createElement('div');
	tip.className = 'work-tip';
	tip.hidden = true;
	document.body.appendChild(tip);

	document.querySelectorAll('[data-tip]').forEach(function (el) {
		el.addEventListener('pointerenter', function () {
			tip.textContent = el.getAttribute('data-tip');
			tip.hidden = false;
		});
		el.addEventListener('pointermove', function (e) {
			var x = Math.min(e.clientX + 12, window.innerWidth - tip.offsetWidth - 8);
			tip.style.left = x + 'px';
			tip.style.top = (e.clientY + 14) + 'px';
		});
		el.addEventListener('pointerleave', function () { tip.hidden = true; });
	});
})();
