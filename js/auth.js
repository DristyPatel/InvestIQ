/* ==========================================================================
   AUTH.JS
   --------------------------------------------------------------------------
   Shared behavior for login.html, signup.html, and forgot-password.html.
   This file is loaded on all three pages, but each init function checks
   whether its form actually exists on the current page before doing
   anything (`if (!form) return;`) -- so nothing breaks on pages that
   don't have, say, a signup form.

   IMPORTANT FOR LATER PHASES:
   Right now there is no backend, so "submitting" a form just runs
   validation, shows a loading spinner for a moment, then shows a success
   message -- there's no real account creation or authentication happening
   yet. Every place that will need a real fetch() call to Flask later is
   marked with a "BACKEND HOOK" comment so it's easy to find and swap in.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     VALIDATORS
     Small, composable, reusable across every form on the site.
     ------------------------------------------------------------------ */
  var validators = {
    required: function (value) {
      return value.trim().length > 0;
    },
    email: function (value) {
      // Good-enough email pattern for client-side UX validation.
      // Real, authoritative validation always happens server-side too.
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
    },
    minLength: function (value, length) {
      return value.length >= length;
    }
  };

  /**
   * Marks a field as invalid: adds the red border, sets aria-invalid
   * for screen readers, and reveals the matching .field-error text.
   */
  function setFieldError(input, message) {
    var group = input.closest('.form-group');
    input.classList.add('is-invalid');
    input.setAttribute('aria-invalid', 'true');
    if (group) {
      var errorEl = group.querySelector('.field-error');
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('is-visible');
      }
    }
  }

  /** Clears a single field's error state. */
  function clearFieldError(input) {
    var group = input.closest('.form-group');
    input.classList.remove('is-invalid');
    input.removeAttribute('aria-invalid');
    if (group) {
      var errorEl = group.querySelector('.field-error');
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.remove('is-visible');
      }
    }
  }

  /**
   * Shows one of the two top-of-form alert banners (success or error)
   * and hides the other. `type` is 'success' or 'error'.
   */
  function showAlert(form, type, message) {
    var success = form.querySelector('.alert-success');
    var error = form.querySelector('.alert-error');
    [success, error].forEach(function (el) {
      if (el) el.classList.remove('is-visible');
    });
    var target = type === 'success' ? success : error;
    if (target) {
      var textEl = target.querySelector('.alert__text');
      if (textEl) textEl.textContent = message;
      target.classList.add('is-visible');
    }
  }

  /** Toggles a submit button between its normal and loading state. */
  function setLoading(button, isLoading) {
    button.classList.toggle('is-loading', isLoading);
    button.disabled = isLoading;
  }

  /* ------------------------------------------------------------------
     SESSION (frontend-only, no backend yet)
     Stores a "logged in" flag plus a dummy user profile in localStorage
     so the Dashboard and its sub-pages know a session exists, and so
     the topbar/sidebar have a name/email to show later. auth-guard.js
     reads the same key to decide whether to allow access to the
     Dashboard pages or bounce back to login.

     BACKEND HOOK: once Flask exists, replace this localStorage write
     with the real session/token returned by /api/login or /api/signup.
     ------------------------------------------------------------------ */
  var SESSION_KEY = 'investiq_auth';
  var USER_KEY = 'investiq_user';

  function startSession(user) {
    localStorage.setItem(SESSION_KEY, 'true');
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  /* ------------------------------------------------------------------
     PASSWORD SHOW/HIDE TOGGLE
     Works on any button with a `data-toggle-password="inputId"`
     attribute -- used on login, signup, and confirm-password fields.
     ------------------------------------------------------------------ */
  function initPasswordToggles() {
    document.querySelectorAll('[data-toggle-password]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = document.getElementById(btn.getAttribute('data-toggle-password'));
        if (!input) return;
        var isCurrentlyPassword = input.type === 'password';
        input.type = isCurrentlyPassword ? 'text' : 'password';
        btn.classList.toggle('is-visible', isCurrentlyPassword);
        btn.setAttribute('aria-label', isCurrentlyPassword ? 'Hide password' : 'Show password');
      });
    });
  }

  /* ------------------------------------------------------------------
     PASSWORD STRENGTH METER (signup page)
     Scores 0-4 based on length + character variety, then colors the
     four bars accordingly. Purely a UX nudge, not a security control.
     ------------------------------------------------------------------ */
  function scorePassword(pw) {
    var score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }

  function updateStrengthMeter(pw) {
    var meter = document.querySelector('.strength-meter');
    if (!meter) return;
    var bars = meter.querySelectorAll('.strength-meter__bar');
    var label = meter.querySelector('.strength-meter__label');
    var score = pw ? scorePassword(pw) : 0;
    var levels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    var colors = ['', 'var(--color-danger)', 'var(--color-warning)', 'var(--color-primary)', 'var(--color-success)'];

    bars.forEach(function (bar, i) {
      bar.style.background = i < score ? colors[score] : 'var(--color-border)';
    });

    if (label) {
      label.textContent = pw ? levels[score] : '';
      label.style.color = pw ? colors[score] : 'var(--color-text-muted)';
    }
  }

  /* ------------------------------------------------------------------
     LOGIN FORM
     ------------------------------------------------------------------ */
  function initLoginForm() {
    var form = document.getElementById('loginForm');
    if (!form) return;

    var email = form.querySelector('#loginEmail');
    var password = form.querySelector('#loginPassword');
    var submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var isValid = true;

      clearFieldError(email);
      clearFieldError(password);

      if (!validators.required(email.value)) {
        setFieldError(email, 'Email is required.');
        isValid = false;
      } else if (!validators.email(email.value)) {
        setFieldError(email, 'Enter a valid email address.');
        isValid = false;
      }

      if (!validators.required(password.value)) {
        setFieldError(password, 'Password is required.');
        isValid = false;
      } else if (!validators.minLength(password.value, 8)) {
        setFieldError(password, 'Password must be at least 8 characters.');
        isValid = false;
      }

      if (!isValid) {
        showAlert(form, 'error', 'Please fix the highlighted fields and try again.');
        return;
      }

      // BACKEND HOOK: replace this setTimeout with a real
      // fetch('/api/login', { method: 'POST', body: ... }) call once
      // the Flask backend exists. The loading/success pattern below
      // stays exactly the same either way -- only the startSession()
      // payload would change, to whatever the real API returns.
      setLoading(submitBtn, true);
      setTimeout(function () {
        setLoading(submitBtn, false);
        showAlert(form, 'success', 'Login successful. Redirecting to your dashboard...');

        startSession({ name: email.value.split('@')[0], email: email.value });

        setTimeout(function () {
          window.location.href = 'dashboard.html';
        }, 900);
      }, 1400);
    });
  }

  /* ------------------------------------------------------------------
     SIGNUP FORM
     ------------------------------------------------------------------ */
  function initSignupForm() {
    var form = document.getElementById('signupForm');
    if (!form) return;

    var name = form.querySelector('#signupName');
    var email = form.querySelector('#signupEmail');
    var password = form.querySelector('#signupPassword');
    var confirmPassword = form.querySelector('#signupConfirmPassword');
    var terms = form.querySelector('#signupTerms');
    var submitBtn = form.querySelector('button[type="submit"]');

    if (password) {
      password.addEventListener('input', function () {
        updateStrengthMeter(password.value);
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var isValid = true;

      [name, email, password, confirmPassword].forEach(clearFieldError);

      if (!validators.required(name.value)) {
        setFieldError(name, 'Full name is required.');
        isValid = false;
      }

      if (!validators.required(email.value)) {
        setFieldError(email, 'Email is required.');
        isValid = false;
      } else if (!validators.email(email.value)) {
        setFieldError(email, 'Enter a valid email address.');
        isValid = false;
      }

      if (!validators.required(password.value)) {
        setFieldError(password, 'Password is required.');
        isValid = false;
      } else if (!validators.minLength(password.value, 8)) {
        setFieldError(password, 'Use at least 8 characters.');
        isValid = false;
      }

      if (!validators.required(confirmPassword.value) || confirmPassword.value !== password.value) {
        setFieldError(confirmPassword, 'Passwords do not match.');
        isValid = false;
      }

      if (!isValid) {
        showAlert(form, 'error', 'Please fix the highlighted fields and try again.');
        return;
      }

      if (terms && !terms.checked) {
        showAlert(form, 'error', 'Please accept the Terms of Service to continue.');
        return;
      }

      // BACKEND HOOK: replace with fetch('/api/signup', ...) later.
      setLoading(submitBtn, true);
      setTimeout(function () {
        setLoading(submitBtn, false);
        showAlert(form, 'success', 'Account created! Redirecting to your dashboard...');

        startSession({ name: name.value, email: email.value });

        setTimeout(function () {
          window.location.href = 'dashboard.html';
        }, 900);
      }, 1400);
    });
  }

  /* ------------------------------------------------------------------
     FORGOT PASSWORD FORM
     ------------------------------------------------------------------ */
  function initForgotForm() {
    var form = document.getElementById('forgotForm');
    if (!form) return;

    var email = form.querySelector('#forgotEmail');
    var submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var isValid = true;

      clearFieldError(email);

      if (!validators.required(email.value)) {
        setFieldError(email, 'Email is required.');
        isValid = false;
      } else if (!validators.email(email.value)) {
        setFieldError(email, 'Enter a valid email address.');
        isValid = false;
      }

      if (!isValid) {
        showAlert(form, 'error', 'Please enter a valid email address.');
        return;
      }

      // BACKEND HOOK: replace with fetch('/api/forgot-password', ...) later.
      setLoading(submitBtn, true);
      setTimeout(function () {
        setLoading(submitBtn, false);
        showAlert(form, 'success', 'If an account exists for that email, a reset link is on its way.');
        form.reset();
      }, 1400);
    });
  }

  /* ------------------------------------------------------------------
     INIT -- runs once the DOM is ready. Since our <script> tags use
     `defer`, the DOM is already parsed by the time this file runs, but
     we still listen for DOMContentLoaded defensively in case this
     script is ever moved or loaded differently.
     ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    initPasswordToggles();
    initLoginForm();
    initSignupForm();
    initForgotForm();
  });
})();