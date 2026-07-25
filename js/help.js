/* ==========================================================================
   HELP.JS
   --------------------------------------------------------------------------
   Behavior for help.html only. dashboard.js (loaded first) already
   handles the sidebar drawer, dropdowns, and topbar date -- this file
   only adds what's specific to this page: a smooth (non-native-jump)
   FAQ accordion, live search filtering of the FAQ list, ticket form
   validation, and the Live Chat button's UI-only feedback.

   There is no backend yet, so search only filters the FAQ list already
   rendered in the DOM, and the ticket/live chat actions are simulated.
   Every spot that will need a real request later is marked
   // BACKEND HOOK.
   ========================================================================== */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     1. SMOOTH FAQ ACCORDION
     <details>/<summary> already gives free expand/collapse and
     accessibility, but the native toggle is an instant snap. This
     intercepts the click and animates the answer's height instead,
     while keeping the same open/closed semantics (and the CSS chevron
     rotation in help.css, which keys off the [open] attribute).
     ------------------------------------------------------------------ */
  function initFaqAccordion() {
    var faqItems = document.querySelectorAll('.faq-item');
    if (!faqItems.length) return;

    faqItems.forEach(function (item) {
      var summary = item.querySelector('.faq-item__question');
      var answer = item.querySelector('.faq-item__answer');
      if (!summary || !answer) return;

      // Start fully closed (details starts without the `open` attribute
      // in the markup, so this just makes sure inline styles agree).
      answer.style.overflow = 'hidden';

      summary.addEventListener('click', function (e) {
        e.preventDefault();

        var isOpen = item.hasAttribute('open');

        // Accordion behavior: close any other open FAQ before opening
        // this one, so only one answer is visible at a time.
        if (!isOpen) {
          faqItems.forEach(function (other) {
            if (other !== item && other.hasAttribute('open')) {
              collapseItem(other);
            }
          });
          expandItem(item);
        } else {
          collapseItem(item);
        }
      });
    });

    function expandItem(item) {
      var answer = item.querySelector('.faq-item__answer');
      item.setAttribute('open', '');

      if (prefersReducedMotion) return;

      var targetHeight = answer.scrollHeight;
      answer.style.maxHeight = '0px';
      answer.style.opacity = '0';
      answer.style.transition = 'none';
      void answer.offsetHeight;
      answer.style.transition = 'max-height 0.3s ease, opacity 0.25s ease';
      requestAnimationFrame(function () {
        answer.style.maxHeight = targetHeight + 'px';
        answer.style.opacity = '1';
      });

      // Clear the fixed height once the transition finishes so the
      // answer can still grow if the window is resized afterward.
      setTimeout(function () {
        answer.style.maxHeight = 'none';
      }, 320);
    }

    function collapseItem(item) {
      var answer = item.querySelector('.faq-item__answer');

      if (prefersReducedMotion) {
        item.removeAttribute('open');
        return;
      }

      var currentHeight = answer.scrollHeight;
      answer.style.maxHeight = currentHeight + 'px';
      void answer.offsetHeight;
      answer.style.transition = 'max-height 0.25s ease, opacity 0.2s ease';
      answer.style.maxHeight = '0px';
      answer.style.opacity = '0';

      setTimeout(function () {
        item.removeAttribute('open');
      }, 250);
    }
  }

  /* ------------------------------------------------------------------
     2. HELP SEARCH FILTER
     Filters the FAQ list live as the user types, matching against both
     the question and answer text. Non-matching items fade out rather
     than disappearing instantly.
     ------------------------------------------------------------------ */
  function initHelpSearch() {
    var form = document.getElementById('helpSearchForm');
    var input = document.getElementById('helpSearchInput');
    var faqItems = document.querySelectorAll('.faq-item');
    if (!input || !faqItems.length) return;

    function applySearch() {
      var query = input.value.trim().toLowerCase();

      faqItems.forEach(function (item) {
        var question = item.querySelector('.faq-item__question');
        var answer = item.querySelector('.faq-item__answer');
        var text = ((question ? question.textContent : '') + ' ' + (answer ? answer.textContent : '')).toLowerCase();
        var matches = !query || text.indexOf(query) !== -1;

        if (matches) {
          item.style.display = '';
          if (!prefersReducedMotion) {
            item.style.opacity = '0';
            requestAnimationFrame(function () {
              item.style.transition = 'opacity 0.25s ease';
              item.style.opacity = '1';
            });
          }
        } else {
          item.style.display = 'none';
        }
      });
    }

    // BACKEND HOOK: once help articles live server-side (not just the
    // 8 FAQ entries on this page), replace this local filter with a
    // debounced call to /api/help/search?query=... instead.
    input.addEventListener('input', applySearch);

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        applySearch();
      });
    }
  }

  /* ------------------------------------------------------------------
     3. RAISE A SUPPORT TICKET -- validation + simulated submit
     ------------------------------------------------------------------ */
  function setFieldError(input, message) {
    var group = input.closest('.form-group');
    input.classList.add('is-invalid');
    if (group) {
      var errorEl = group.querySelector('.field-error');
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('is-visible');
      }
    }
  }

  function clearFieldError(input) {
    var group = input.closest('.form-group');
    input.classList.remove('is-invalid');
    if (group) {
      var errorEl = group.querySelector('.field-error');
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.remove('is-visible');
      }
    }
  }

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

  function setLoading(button, isLoading) {
    if (!button) return;
    button.classList.toggle('is-loading', isLoading);
    button.disabled = isLoading;
  }

  function initTicketForm() {
    var form = document.getElementById('ticketForm');
    if (!form) return;

    var subject = document.getElementById('ticketSubject');
    var description = document.getElementById('ticketDescription');
    var submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var isValid = true;

      [subject, description].forEach(function (field) {
        if (field) clearFieldError(field);
      });

      if (!subject || !subject.value.trim()) {
        if (subject) setFieldError(subject, 'Please enter a subject.');
        isValid = false;
      }

      if (!description || !description.value.trim()) {
        if (description) setFieldError(description, 'Please describe your issue.');
        isValid = false;
      }

      if (!isValid) {
        showAlert(form, 'error', 'Please fill in the highlighted fields and try again.');
        return;
      }

      // BACKEND HOOK: POST the ticket payload (subject, category,
      // priority, description, attachment) to /api/support/tickets.
      setLoading(submitBtn, true);
      setTimeout(function () {
        setLoading(submitBtn, false);
        showAlert(form, 'success', 'Your ticket has been submitted. Our team will respond within 24 hours.');
        form.reset();
      }, 1200);
    });
  }

  /* ------------------------------------------------------------------
     4. LIVE CHAT BUTTON (UI only)
     ------------------------------------------------------------------ */
  function initLiveChat() {
    var chatBtn = document.querySelector('[data-action="start-chat"]');
    if (!chatBtn) return;

    var label = chatBtn.querySelector('.btn-label');
    if (!label) return;
    var originalText = label.textContent;

    chatBtn.addEventListener('click', function () {
      chatBtn.disabled = true;
      chatBtn.style.opacity = '0.75';
      label.textContent = 'Connecting...';

      // BACKEND HOOK: open a real chat session (e.g. via a websocket
      // or third-party chat widget) once live chat is wired up.
      setTimeout(function () {
        label.textContent = 'Chat Started ✓';
        setTimeout(function () {
          label.textContent = originalText;
          chatBtn.disabled = false;
          chatBtn.style.opacity = '';
        }, 1600);
      }, 900);
    });
  }

  /* ------------------------------------------------------------------
     5. FEEDBACK FORM -- simple simulated submit
     ------------------------------------------------------------------ */
  function initFeedbackForm() {
    var form = document.getElementById('feedbackForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var submitBtn = form.querySelector('button[type="submit"]');
      var label = submitBtn ? submitBtn.querySelector('.btn-label') : null;
      if (!label) return;
      var originalText = label.textContent;

      // BACKEND HOOK: POST { rating, message } to /api/feedback.
      submitBtn.disabled = true;
      label.textContent = 'Sending...';
      setTimeout(function () {
        label.textContent = 'Thank You ✓';
        form.reset();
        setTimeout(function () {
          label.textContent = originalText;
          submitBtn.disabled = false;
        }, 1600);
      }, 800);
    });
  }

  /* ------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    initFaqAccordion();
    initHelpSearch();
    initTicketForm();
    initLiveChat();
    initFeedbackForm();
  });
})();
