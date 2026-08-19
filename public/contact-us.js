/**
 * contact-us.js
 * Client-side submit handler for the INSTAR Lab "Contact Us" form (contact-us.html).
 *
 * Posts to the shared Tao Learning door.taolearning.org Logic App endpoint —
 * the same integration pattern used by focushive.com's #contactus form and
 * ignitecuriosity.org's #registerForm (both backed by Logic Apps + Dynamics 365).
 *
 * No external dependencies — plain ES5-compatible JS only.
 */
(function () {
    'use strict';

    var ENDPOINT = 'https://door.taolearning.org/api/form';
    // TODO(owner): set to INSTAR Lab's Dynamics 365 "owner" GUID once provisioned
    // by whoever administers the Tao Learning Azure/Dynamics 365 tenant — this is
    // the routing key that tells the shared Logic App which org's CRM record a
    // submission belongs to (see the `owner` hidden field on focushive.com's
    // #contactus form for the pattern). Until it's set, submissions will still
    // reach the shared endpoint but may not route to an INSTAR-specific record —
    // the mailto fallback below covers that gap in the meantime.
    var OWNER_GUID = '';
    var FALLBACK_EMAIL = 'info@instarlab.org';

    function isValidEmail(val) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    }

    function setMessage(msgEl, html, isError) {
        msgEl.innerHTML = html;
        msgEl.style.color = isError ? '#c0392b' : '#2e7d32';
        msgEl.style.display = 'block';
    }

    document.addEventListener('DOMContentLoaded', function () {
        var form  = document.getElementById('contact-form');
        var msgEl = document.querySelector('.form-messege');
        if (!form || !msgEl) { return; }

        var submitBtn = form.querySelector('button[type="submit"]');
        var originalBtnText = submitBtn ? submitBtn.textContent : 'Send your message';

        // Clear status message when user starts editing again.
        form.addEventListener('input', function () {
            msgEl.innerHTML = '';
            msgEl.style.display = 'none';
        });

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            // Honeypot: a hidden field real users never see or fill.
            // Bots that auto-fill every field trip it; pretend success and
            // drop the submission rather than telling the bot it was caught.
            var honeypotEl = form.querySelector('input[name="_gotcha"]');
            if (honeypotEl && honeypotEl.value) {
                form.style.display = 'none';
                setMessage(msgEl, 'Thanks for reaching out &mdash; we’ll be in touch soon.', false);
                return;
            }

            var nameEl    = document.getElementById('name');
            var emailEl   = document.getElementById('email');
            var subjectEl = document.getElementById('subject');
            var phoneEl   = document.getElementById('phone');
            var messageEl = document.getElementById('message');

            var name    = nameEl    ? nameEl.value.trim()    : '';
            var email   = emailEl   ? emailEl.value.trim()   : '';
            var subject = subjectEl ? subjectEl.value.trim() : '';
            var phone   = phoneEl   ? phoneEl.value.trim()   : '';
            var message = messageEl ? messageEl.value.trim() : '';

            // ── Validate required fields ─────────────────────────────────────
            var errors = [];

            if (!name) {
                errors.push('Name is required.');
            }
            if (!email) {
                errors.push('Email is required.');
            } else if (!isValidEmail(email)) {
                errors.push('Please enter a valid email address.');
            }
            if (!message) {
                errors.push('Please include a message.');
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

            // Tao Learning's shared intake schema expects split first/last name.
            var nameParts = name.split(/\s+/);
            var firstName = nameParts.shift();
            var lastName  = nameParts.join(' ');

            // ── Build payload ─────────────────────────────────────────────────
            var payload = {
                firstname:   firstName,
                lastname:    lastName || firstName,
                email:       email,
                tel:         phone,
                topic:       subject,
                information: message,
                _subject:    'Inquiry: INSTAR Lab',
                owner:       OWNER_GUID,
                website:     'https://instarlab.org',
                campaign:    'INSTAR Lab',
                source:      'instarlab.org/contact-us.html',
                submittedAt: new Date().toISOString()
            };

            // ── POST to the Tao Learning Logic App ────────────────────────────
            fetch(ENDPOINT, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload)
            })
            .then(function (res) {
                if (res.ok) {
                    form.style.display = 'none';
                    setMessage(
                        msgEl,
                        'Thank you &mdash; your message has been received. A member of the INSTAR team will respond within one business day.',
                        false
                    );
                    msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    throw new Error('HTTP ' + res.status);
                }
            })
            .catch(function (err) {
                console.error('INSTAR contact form submission error:', err);
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
