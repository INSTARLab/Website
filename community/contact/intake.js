/**
 * intake.js
 * Client-side submit handler for the INSTAR master intake / contact form.
 *
 * Posts to the instar-intake Azure Logic App endpoint.
 * The ?type= query parameter pre-selects the inquiry type dropdown on page load.
 *
 * No external dependencies — plain ES5-compatible JS only.
 */
(function () {
    'use strict';

    var ENDPOINT = 'https://prod-87.eastus.logic.azure.com:443/workflows/fa1a05562d754082bdef43b1819699e5/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=dcENYzxiUTq13xh-CUAITxlZOXlbw8EMjhP2zQsriWM';
    var FALLBACK_EMAIL = 'info@instarlab.org';

    /**
     * Map a ?type= query param value (case-insensitive, substring) to the
     * canonical inquiry type option value used in the <select>.
     */
    var TYPE_MAP = [
        { patterns: ['partner', 'sponsor'],          value: 'Partnership / Sponsorship' },
        { patterns: ['sttr', 'sbir', 'commerciali'], value: 'STTR / SBIR Commercialization' },
        { patterns: ['government', 'agency', 'federal', 'sponsored research'],
                                                     value: 'Government / Agency-Sponsored Research' },
        { patterns: ['philanthrop', 'donor', 'donat', 'gift'],
                                                     value: 'Philanthropy / Donor' },
        { patterns: ['press', 'media', 'journalist', 'pr'],
                                                     value: 'Press / Media' },
        { patterns: ['general', 'inquiry', 'other'], value: 'General Inquiry' }
    ];

    /** Resolve a raw query-param string to a canonical dropdown value, or null. */
    function resolveInquiryType(raw) {
        if (!raw) { return null; }
        var lower = raw.toLowerCase();
        for (var i = 0; i < TYPE_MAP.length; i++) {
            var entry = TYPE_MAP[i];
            for (var j = 0; j < entry.patterns.length; j++) {
                if (lower.indexOf(entry.patterns[j]) !== -1) {
                    return entry.value;
                }
            }
        }
        return null;
    }

    /** Simple email format check (RFC-permissive). */
    function isValidEmail(val) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    }

    /** Write a status message into .form-messege. */
    function setMessage(msgEl, html, isError) {
        msgEl.innerHTML = html;
        msgEl.style.color = isError ? '#c0392b' : '#2e7d32';
        msgEl.style.display = 'block';
    }

    /** Parse the ?type= param from location.search. */
    function getQueryParam(name) {
        var search = window.location.search;
        if (!search) { return null; }
        var pairs = search.replace(/^\?/, '').split('&');
        for (var i = 0; i < pairs.length; i++) {
            var kv = pairs[i].split('=');
            if (decodeURIComponent(kv[0]) === name) {
                return kv[1] ? decodeURIComponent(kv[1].replace(/\+/g, ' ')) : '';
            }
        }
        return null;
    }

    document.addEventListener('DOMContentLoaded', function () {
        var form      = document.getElementById('contact-form');
        var msgEl     = document.querySelector('.form-messege');
        if (!form || !msgEl) { return; }

        var submitBtn       = form.querySelector('button[type="submit"]');
        var originalBtnText = submitBtn ? submitBtn.textContent : 'Send Message';

        // ── Pre-select inquiry type from ?type= query param ─────────────────
        var typeParam    = getQueryParam('type');
        var resolvedType = resolveInquiryType(typeParam);
        if (resolvedType) {
            var selectEl = document.getElementById('inquiry-type');
            if (selectEl) {
                for (var i = 0; i < selectEl.options.length; i++) {
                    if (selectEl.options[i].value === resolvedType) {
                        selectEl.selectedIndex = i;
                        break;
                    }
                }
            }
        }

        // Clear status message when user starts editing again.
        form.addEventListener('input', function () {
            msgEl.innerHTML = '';
            msgEl.style.display = 'none';
        });

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            var firstNameEl  = document.getElementById('first-name');
            var lastNameEl   = document.getElementById('last-name');
            var emailEl      = document.getElementById('email');
            var phoneEl      = document.getElementById('phone');
            var orgEl        = document.getElementById('org');
            var inquiryEl    = document.getElementById('inquiry-type');
            var messEl       = document.getElementById('mess');
            var ndaEl        = document.getElementById('nda-willing');
            var consentEl    = document.getElementById('consent');

            // ── Validate required fields ─────────────────────────────────────
            var errors = [];

            var firstName = firstNameEl ? firstNameEl.value.trim() : '';
            var lastName  = lastNameEl  ? lastNameEl.value.trim()  : '';
            var email     = emailEl     ? emailEl.value.trim()     : '';
            var phone     = phoneEl     ? phoneEl.value.trim()     : '';
            var org       = orgEl       ? orgEl.value.trim()       : '';
            var inquiryType = inquiryEl ? inquiryEl.value          : '';
            var mess      = messEl      ? messEl.value.trim()      : '';
            var ndaWilling  = ndaEl     ? ndaEl.checked            : false;
            var consent   = consentEl   ? consentEl.checked        : false;

            if (!firstName) {
                errors.push('First name is required.');
            }
            if (!lastName) {
                errors.push('Last name is required.');
            }
            if (!email) {
                errors.push('Email is required.');
            } else if (!isValidEmail(email)) {
                errors.push('Please enter a valid email address.');
            }
            if (!inquiryType) {
                errors.push('Please select an inquiry type.');
            }
            if (!consent) {
                errors.push('You must agree to be contacted before submitting.');
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

            // ── In-flight state ───────────────────────────────────────────────
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending…';
            }
            msgEl.innerHTML = '';
            msgEl.style.display = 'none';

            // ── Build payload ─────────────────────────────────────────────────
            var payload = {
                firstName:    firstName,
                lastName:     lastName,
                email:        email,
                phone:        phone,
                organization: org,
                inquiryType:  inquiryType,
                message:      mess,
                ndaWilling:   ndaWilling,
                source:       'instarlab.org' + window.location.pathname,
                submittedAt:  new Date().toISOString()
            };

            // ── POST to Azure Logic App ───────────────────────────────────────
            fetch(ENDPOINT, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload)
            })
            .then(function (res) {
                if (res.ok) {
                    // Success: hide form, show confirmation
                    form.style.display = 'none';
                    setMessage(
                        msgEl,
                        'Thank you &mdash; your inquiry has been received. A member of the INSTAR team will respond within one business day.',
                        false
                    );
                    msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    // Non-2xx: surface a specific error with fallback email
                    throw new Error('HTTP ' + res.status);
                }
            })
            .catch(function (err) {
                // Network error or non-2xx thrown above
                console.error('INSTAR intake form submission error:', err);
                // Re-enable button so user can retry
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
