/**
 * newsletter.js — vanilla JSONP replacement for jquery.ajaxchimp on #mc-form.
 * Mailchimp's classic embedded-form endpoint doesn't send CORS headers, so a
 * real fetch() can't read the response — JSONP (a <script> tag hitting
 * post-json with a callback param) is what ajaxChimp itself did under the
 * hood, so the network behavior here is unchanged, just without jQuery.
 */
(function () {
	"use strict";

	var MAILCHIMP_URL =
		"http://themeshaven.us8.list-manage.com/subscribe/post-json?u=759ce8a8f4f1037e021ba2922&id=a2452237f8";

	var form = document.getElementById("mc-form");
	if (!form) return;

	var emailInput = document.getElementById("mc-email");
	var successEl = document.querySelector(".mailchimp-success");
	var errorEl = document.querySelector(".mailchimp-error");
	var callbackCounter = 0;

	function showMessage(el, otherEl, message) {
		if (otherEl) otherEl.style.display = "none";
		if (!el) return;
		el.textContent = message;
		el.style.display = "block";
	}

	form.addEventListener("submit", function (e) {
		e.preventDefault();
		var email = emailInput ? emailInput.value.trim() : "";
		if (!email) return;

		var callbackName = "mailchimpCallback_" + Date.now() + "_" + callbackCounter++;
		var script = document.createElement("script");

		window[callbackName] = function (resp) {
			delete window[callbackName];
			script.remove();
			if (resp && resp.result === "success") {
				showMessage(successEl, errorEl, resp.msg);
				form.reset();
			} else {
				showMessage(errorEl, successEl, (resp && resp.msg) || "Subscription failed. Please try again.");
			}
		};

		script.src =
			MAILCHIMP_URL +
			"&EMAIL=" +
			encodeURIComponent(email) +
			"&c=" +
			callbackName;
		script.onerror = function () {
			delete window[callbackName];
			script.remove();
			showMessage(errorEl, successEl, "Subscription failed. Please try again.");
		};
		document.body.appendChild(script);
	});
})();
