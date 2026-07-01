/**
 * partner-form.js
 * Client-side submit handler for the INSTAR partner / sponsorship inquiry form.
 *
 * Posts to the same Azure Logic Apps endpoint used by fellowship/index.html.
 * A distinguishing inquiryType + source field routes the submission downstream.
 *
 * Endpoint:
 *   https://prod-43.eastus.logic.azure.com:443/workflows/0c62431847804140a55ca8da81632b74/...
 *
 * No external dependencies — plain ES5-compatible JS only.
 */
(function () {
    'use strict';

    // Reuse the INSTAR fellowship Logic App — same org, same Azure subscription.
    // inquiryType and source fields distinguish it from fellowship submissions.
    var ENDPOINT = 'https://prod-43.eastus.logic.azure.com:443/workflows/0c62431847804140a55ca8da81632b74/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=U4M3zxOInH_qbBoZqkcSZOm6XgIlMTC0F9ZKULwg0y4';
    var FALLBACK_EMAIL = 'info@instarlab.org';

    /** Simple email format check (RFC-permissive: must have @ with chars on both sides). */
    function isValidEmail(val) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    }

    /** Write a status message into .form-messege. */
    function setMessage(msgEl, html, isError) {
        msgEl.innerHTML = html;
        msgEl.style.color = isError ? '#c0392b' : '#2e7d32';
        msgEl.style.display = 'block';
    }

    document.addEventListener('DOMContentLoaded', function () {
        var form   = document.getElementById('contact-form');
        var msgEl  = document.querySelector('.form-messege');
        if (!form || !msgEl) { return; }

        var submitBtn = form.querySelector('button[type="submit"]');
        var originalBtnText = submitBtn ? submitBtn.textContent : 'Send Message';

        // Clear status message when user starts editing again.
        form.addEventListener('input', function () {
            msgEl.innerHTML = '';
            msgEl.style.display = 'none';
        });

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            var nameEl  = document.getElementById('name');
            var emailEl = document.getElementById('email');
            var orgEl   = document.getElementById('org');
            var phoneEl = document.getElementById('phone');
            var messEl  = document.getElementById('mess');

            // ── Validate required fields ────────────────────────────────────
            var errors = [];

            var name  = nameEl  ? nameEl.value.trim()  : '';
            var email = emailEl ? emailEl.value.trim()  : '';
            var org   = orgEl   ? orgEl.value.trim()   : '';
            var phone = phoneEl ? phoneEl.value.trim()  : '';
            var mess  = messEl  ? messEl.value.trim()   : '';

            if (!name) {
                errors.push('Name is required.');
            }
            if (!email) {
                errors.push('Email is required.');
            } else if (!isValidEmail(email)) {
                errors.push('Please enter a valid email address.');
            }
            if (!mess) {
                errors.push('Please describe your inquiry in the message field.');
            }

            if (errors.length > 0) {
                setMessage(
                    msgEl,
                    '<strong>Please correct the following:</strong><ul style="margin:6px 0 0;padding-left:20px;">' +
                        errors.map(function (err) { return '<li>' + err + '</li>'; }).join('') +
                    '</ul>',
                    true
                );
                msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            // ── In-flight state ─────────────────────────────────────────────
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending…';
            }
            msgEl.innerHTML = '';
            msgEl.style.display = 'none';

            // ── Build payload ───────────────────────────────────────────────
            var payload = {
                inquiryType:  'Partner / Sponsorship Inquiry',
                source:       'instarlab.org/community/partner',
                submittedAt:  new Date().toISOString(),
                name:         name,
                email:        email,
                organization: org,
                phone:        phone,
                message:      mess
            };

            // ── POST to Azure Logic App ─────────────────────────────────────
            fetch(ENDPOINT, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload)
            })
            .then(function (res) {
                if (res.ok) {
                    // Success: hide form, show confirmation in .form-messege
                    form.style.display = 'none';
                    setMessage(
                        msgEl,
                        'Thank you &mdash; your inquiry has been received. A member of the INSTAR team will respond within one business day.',
                        false
                    );
                    msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    throw new Error('HTTP ' + res.status);
                }
            })
            .catch(function (err) {
                console.error('Partner inquiry form submission error:', err);
                // Re-enable button and show friendly error with direct-email fallback.
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
                setMessage(
                    msgEl,
                    'Submission failed. Please email us directly at <a href="mailto:' + FALLBACK_EMAIL + '">' + FALLBACK_EMAIL + '</a>.',
                    true
                );
                msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        });
    });
}());
