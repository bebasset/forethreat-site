/* =========================================================================
   Forethreat Security — shared site script (no dependencies)

   CONFIGURATION — edit these values, nothing else in this file needs to change.
   Every integration below is OFF until you fill it in. While a value is null the
   site falls back to something that already works (email), so nothing breaks.
   See docs/growth/08-website-setup.md for step-by-step setup.
   ========================================================================= */
var FT_CONFIG = {
  // Lead form backend. Pick ONE provider, then paste its value.
  //   'formspree' → FORM_ENDPOINT = 'https://formspree.io/f/xxxxxxx'
  //   'web3forms' → FORM_ENDPOINT = 'https://api.web3forms.com/submit', FORM_ACCESS_KEY = '<key>'
  // While FORM_PROVIDER is null, the form opens a pre-filled email instead.
  FORM_PROVIDER: 'formspree',
  FORM_ENDPOINT: 'https://formspree.io/f/xrppdjbp',
  FORM_ACCESS_KEY: null,

  // Cloudflare Turnstile CAPTCHA (free). Paste the SITE key here (public by
  // design); the SECRET key goes only into Formspree → form Settings → CAPTCHA.
  // Only used when a form provider is configured above.
  TURNSTILE_SITE_KEY: '0x4AAAAAAF1kLJZ_DuF0zLvY',

  // Scheduling page for a dedicated "Security Scoping Call" (Google Calendar
  // appointment schedule, Calendly, Cal.com…). Do NOT reuse the mentorship
  // intro-call link here. While null, the "pick a time" button stays hidden.
  SCHEDULING_URL: null,

  CONTACT_EMAIL: 'belizaire@forethreatsec.com'
};

(function () {
  'use strict';

  /* ---- Privacy-friendly event tracking --------------------------------
     Works with Plausible (window.plausible) or Cloudflare Web Analytics
     custom events if/when you add their script tag. Until then: no-op.
     No cookies, no personal data — only the event name + a page label. */
  function track(name, props) {
    try {
      if (typeof window.plausible === 'function') window.plausible(name, { props: props || {} });
    } catch (e) { /* analytics must never break the page */ }
  }
  window.ftTrack = track;

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-track]') : null;
    if (el) track(el.getAttribute('data-track'), { page: location.pathname, label: (el.textContent || '').trim().slice(0, 60) });
  });

  /* ---- Footer year ---------------------------------------------------- */
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---- Mobile navigation --------------------------------------------- */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      links.classList.toggle('open', !open);
    });
  }

  /* ---- Scheduling links (hidden until configured) ---------------------- */
  document.querySelectorAll('[data-schedule]').forEach(function (a) {
    if (FT_CONFIG.SCHEDULING_URL) {
      a.href = FT_CONFIG.SCHEDULING_URL;
      a.target = '_blank';
      a.rel = 'noopener';
      a.hidden = false;
    } else {
      a.hidden = true;
    }
  });

  /* ---- Pre-select the service on contact.html?service=api etc. -------- */
  var params = new URLSearchParams(location.search);
  var svc = params.get('service');
  if (svc) {
    var box = document.querySelector('input[name="services"][value="' + svc.replace(/[^a-z-]/g, '') + '"]');
    if (box) box.checked = true;
  }
  var typ = params.get('type');
  if (typ === 'partner') {
    var sel = document.getElementById('f-driver');
    if (sel) sel.value = 'partner';
  }

  /* ---- Lead form ------------------------------------------------------- */
  var form = document.getElementById('lead-form');
  if (!form) return;
  var status = document.getElementById('form-status');
  var submitBtn = form.querySelector('button[type="submit"]');
  var started = Date.now();
  var captchaOn = !!(FT_CONFIG.FORM_PROVIDER && FT_CONFIG.FORM_ENDPOINT && FT_CONFIG.TURNSTILE_SITE_KEY);
  var captchaBox = document.getElementById('captcha');
  if (captchaOn && captchaBox) {
    captchaBox.className = 'cf-turnstile';
    captchaBox.setAttribute('data-sitekey', FT_CONFIG.TURNSTILE_SITE_KEY);
    captchaBox.setAttribute('data-theme', 'dark');
    captchaBox.hidden = false;
    var ts = document.createElement('script');
    ts.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    ts.async = true; ts.defer = true;
    document.head.appendChild(ts);
  }
  function resetCaptcha() {
    try { if (captchaOn && window.turnstile) window.turnstile.reset(captchaBox); } catch (e) {}
  }

  function setStatus(msg, kind) {
    status.textContent = msg;
    status.className = 'form-status ' + (kind || '');
  }

  function collect() {
    var data = {};
    var fd = new FormData(form);
    fd.forEach(function (v, k) {
      if (k === '_gotcha' || k === 'cf-turnstile-response') return;
      if (data[k]) data[k] = data[k] + ', ' + v; else data[k] = v;
    });
    return data;
  }

  function mailtoFallback(data) {
    var lines = [
      'Name: ' + (data.name || ''),
      'Work email: ' + (data.email || ''),
      'Company: ' + (data.company || ''),
      'Role: ' + (data.role || ''),
      'What needs testing: ' + (data.services || ''),
      'Why now: ' + (data.driver || ''),
      'Target timeline: ' + (data.timeline || ''),
      'Environment size: ' + (data.size || ''),
      '',
      'Context:',
      data.message || ''
    ];
    var href = 'mailto:' + FT_CONFIG.CONTACT_EMAIL +
      '?subject=' + encodeURIComponent('Pentest scoping request — ' + (data.company || data.name || '')) +
      '&body=' + encodeURIComponent(lines.join('\n'));
    window.location.href = href;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    setStatus('', '');

    // Spam checks: honeypot filled, or submitted faster than a human can type.
    var hp = form.querySelector('input[name="_gotcha"]');
    if ((hp && hp.value) || Date.now() - started < 2500) {
      setStatus('Thanks — your request was received.', 'ok');
      form.reset();
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (!form.querySelector('input[name="services"]:checked')) {
      setStatus('Please choose at least one thing you want tested (or "Not sure yet").', 'err');
      form.querySelector('input[name="services"]').focus();
      return;
    }

    var data = collect();
    var qualified = data.timeline && data.timeline !== 'Just researching';
    track('Lead Submitted', { page: location.pathname, services: data.services || '', qualified: qualified ? 'yes' : 'no' });

    if (!FT_CONFIG.FORM_PROVIDER || !FT_CONFIG.FORM_ENDPOINT) {
      setStatus('Opening your email app with your details filled in. If nothing opens, email ' + FT_CONFIG.CONTACT_EMAIL + ' directly.', 'ok');
      mailtoFallback(data);
      return;
    }

    var token = '';
    if (captchaOn) {
      var tokEl = form.querySelector('input[name="cf-turnstile-response"]');
      token = tokEl ? tokEl.value : '';
      if (!token) {
        setStatus('Please complete the quick verification check above the button, then send again.', 'err');
        return;
      }
    }

    var payload = Object.assign({}, data, {
      subject: 'Pentest scoping request — ' + (data.company || data.name || ''),
      page: location.pathname
    });
    if (FT_CONFIG.FORM_PROVIDER === 'web3forms') payload.access_key = FT_CONFIG.FORM_ACCESS_KEY;
    if (token) payload['cf-turnstile-response'] = token;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    // Formspree: send as form fields (matches Formspree's documented Turnstile flow).
    // Web3Forms: JSON.
    var req;
    if (FT_CONFIG.FORM_PROVIDER === 'formspree') {
      var fd = new FormData();
      Object.keys(payload).forEach(function (k) { fd.append(k, payload[k]); });
      req = { method: 'POST', headers: { 'Accept': 'application/json' }, body: fd };
    } else {
      req = { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) };
    }
    fetch(FT_CONFIG.FORM_ENDPOINT, req).then(function (r) {
      if (!r.ok) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          var msg = (j && j.errors && j.errors[0] && j.errors[0].message) || '';
          if (/captcha|turnstile/i.test(msg) || /captcha|turnstile/i.test((j && j.error) || '')) {
            resetCaptcha();
            var e = new Error('captcha'); e.captcha = true; throw e;
          }
          throw new Error('HTTP ' + r.status);
        });
      }
      form.reset();
      form.hidden = true;
      document.getElementById('form-done').hidden = false;
      track('Lead Delivered', { page: location.pathname });
    }).catch(function (err) {
      if (err && err.captcha) {
        setStatus('The verification check expired. Please complete it again and resend.', 'err');
        return;
      }
      resetCaptcha();
      setStatus('Something went wrong sending the form. Please email ' + FT_CONFIG.CONTACT_EMAIL + ' — nothing you entered was lost; we will open your email app now.', 'err');
      mailtoFallback(data);
    }).finally(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send scoping request';
    });
  });
})();
