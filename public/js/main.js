/* Disable Bootstrap carousel autoplay — matches the original nivoSlider
   (pauseTime effectively infinite) and owlCarousel (autoPlay: false)
   configs. data-bs-interval="false" alone doesn't reliably stop Bootstrap's
   internal cycle timer in this bundled version, so pause() is called
   explicitly once each carousel instance exists. */
(function () {
	"use strict";
	if (typeof bootstrap === 'undefined' || !bootstrap.Carousel) return;
	['heroCarousel', 'fellowsCarousel'].forEach(function (id) {
		var el = document.getElementById(id);
		if (!el) return;
		var instance = bootstrap.Carousel.getOrCreateInstance(el, { interval: false });
		instance.pause();
	});
})();

/* Gallery filter — vanilla replacement for jQuery mixitup */
(function () {
	"use strict";
	var filterList = document.querySelectorAll('.gallery-menu .filter');
	var galleryItems = document.querySelectorAll('#gallery-filter .single-gallery');
	if (!filterList.length || !galleryItems.length) return;

	function applyFilter(category) {
		galleryItems.forEach(function (item) {
			var show = category === 'all' || item.classList.contains(category);
			item.style.display = show ? 'block' : 'none';
		});
	}

	filterList.forEach(function (li) {
		li.addEventListener('click', function () {
			filterList.forEach(function (other) { other.classList.remove('active'); });
			li.classList.add('active');
			applyFilter(li.getAttribute('data-filter'));
		});
	});

	filterList[0].classList.add('active');
	applyFilter(filterList[0].getAttribute('data-filter'));
})();

/* YouTube popup — click-to-load facade via Bootstrap modal (no jQuery/magnificPopup) */
(function () {
	"use strict";
	var modalEl = document.getElementById('youtubeModal');
	if (!modalEl) return;
	var iframe = document.getElementById('youtubeModalIframe');
	var videoUrl = modalEl.getAttribute('data-video-src');

	modalEl.addEventListener('shown.bs.modal', function () {
		iframe.src = videoUrl + '?autoplay=1';
	});
	modalEl.addEventListener('hidden.bs.modal', function () {
		iframe.src = 'about:blank';
	});
})();

/* Circular skill-percentage rings — vanilla replacement for jQuery Knob + appear.js */
(function () {
	"use strict";
	var rings = document.querySelectorAll('.knob-progress');
	if (!rings.length) return;

	var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function animateRing(el) {
		var target = parseInt(el.style.getPropertyValue('--pct'), 10) || 0;
		var valueEl = el.querySelector('.knob-progress__value');

		if (reduceMotion) {
			valueEl.textContent = target + '%';
			return;
		}

		var start = null;
		var duration = 1500;

		function step(timestamp) {
			if (!start) start = timestamp;
			var progress = Math.min((timestamp - start) / duration, 1);
			var current = Math.ceil(progress * target);
			el.style.setProperty('--pct', current);
			valueEl.textContent = current + '%';
			if (progress < 1) window.requestAnimationFrame(step);
		}
		el.style.setProperty('--pct', 0);
		window.requestAnimationFrame(step);
	}

	if ('IntersectionObserver' in window) {
		var observer = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					animateRing(entry.target);
					observer.unobserve(entry.target);
				}
			});
		}, { threshold: 0.5 });
		rings.forEach(function (ring) { observer.observe(ring); });
	} else {
		rings.forEach(animateRing);
	}
})();
   