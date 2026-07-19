/**
 * newsletter.js — footer newsletter signup (#mc-form), site-wide.
 *
 * Posts to the shared Tao Learning door.taolearning.org Logic App endpoint —
 * the same integration pattern used by focushive.com and ignitecuriosity.org
 * (Logic App + Dynamics 365 behind a friendly custom domain). Replaces the
 * previous JSONP call to a demo theme vendor's unrelated Mailchimp list.
 */
(function () {
	"use strict";

	var ENDPOINT = "https://door.taolearning.org/api/form";
	// TODO(owner): set to INSTAR Lab's Dynamics 365 "owner" GUID once provisioned
	// by whoever administers the Tao Learning Azure/Dynamics 365 tenant — see the
	// matching TODO in /contact-us.js for context. Until then the mailto fallback
	// below covers a failed or unrouted submission.
	var OWNER_GUID = "";
	var FALLBACK_EMAIL = "info@instarlab.org";

	var form = document.getElementById("mc-form");
	if (!form) return;

	var emailInput = document.getElementById("mc-email");
	var submitBtn = document.getElementById("mc-submit");
	var successEl = document.querySelector(".mailchimp-success");
	var errorEl = document.querySelector(".mailchimp-error");

	function isValidEmail(val) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
	}

	function showMessage(el, otherEl, message) {
		if (otherEl) otherEl.style.display = "none";
		if (!el) return;
		el.textContent = message;
		el.style.display = "block";
	}

	form.addEventListener("submit", function (e) {
		e.preventDefault();
		var email = emailInput ? emailInput.value.trim() : "";
		if (!email || !isValidEmail(email)) {
			showMessage(errorEl, successEl, "Please enter a valid email address.");
			return;
		}

		if (submitBtn) submitBtn.disabled = true;

		fetch(ENDPOINT, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email: email,
				_subject: "Newsletter Signup: INSTAR Lab",
				topic: "Newsletter Subscription",
				owner: OWNER_GUID,
				website: "https://instarlab.org",
				campaign: "INSTAR Lab Newsletter",
				source: "instarlab.org" + window.location.pathname,
				submittedAt: new Date().toISOString()
			})
		})
			.then(function (res) {
				if (submitBtn) submitBtn.disabled = false;
				if (res.ok) {
					showMessage(successEl, errorEl, "Thanks for subscribing!");
					form.reset();
				} else {
					throw new Error("HTTP " + res.status);
				}
			})
			.catch(function () {
				if (submitBtn) submitBtn.disabled = false;
				showMessage(
					errorEl,
					successEl,
					"Subscription failed. Please email " + FALLBACK_EMAIL + " to be added to our list."
				);
			});
	});
})();
