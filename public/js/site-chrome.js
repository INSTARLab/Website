/**
 * site-chrome.js — sticky nav + back-to-top button, no jQuery.
 * Vanilla replacement for the jQuery scroll handler and jquery.scrollUp
 * plugin previously loaded on every page. Markup/CSS selectors (#sticker
 * .stick, #scrollUp) are unchanged so no stylesheet changes were needed.
 */
(function () {
	"use strict";

	var sticker = document.getElementById("sticker");
	var scrollUpLink = null;

	function ensureScrollUpButton() {
		if (scrollUpLink) return scrollUpLink;
		scrollUpLink = document.createElement("a");
		scrollUpLink.id = "scrollUp";
		scrollUpLink.href = "#top";
		scrollUpLink.setAttribute("aria-label", "Scroll to top");
		scrollUpLink.style.position = "fixed";
		scrollUpLink.style.zIndex = "2147483647";
		scrollUpLink.innerHTML = '<i class="fa fa-angle-up" aria-hidden="true"></i>';
		scrollUpLink.addEventListener("click", function (e) {
			e.preventDefault();
			window.scrollTo({ top: 0, behavior: "smooth" });
		});
		document.body.appendChild(scrollUpLink);
		return scrollUpLink;
	}

	function onScroll() {
		var scrollTop = window.pageYOffset || document.documentElement.scrollTop;

		if (sticker) {
			if (scrollTop < 200) {
				sticker.classList.remove("stick");
			} else {
				sticker.classList.add("stick");
			}
		}

		var btn = ensureScrollUpButton();
		btn.style.display = scrollTop > 200 ? "inline" : "none";
	}

	document.addEventListener("DOMContentLoaded", onScroll);
	window.addEventListener("scroll", onScroll, { passive: true });
})();
