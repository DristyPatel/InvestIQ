/* ==========================================================================
   SAVED-REPORTS.JS
   --------------------------------------------------------------------------
   Behavior for saved-reports.html only. dashboard.js (loaded first)
   already handles the sidebar drawer, dropdowns, and the topbar date --
   this file only adds what's specific to this page: search, the
   All/Buy/Hold/Sell filter chips, the sort dropdown, deleting a card
   (with confirmation), and showing/hiding the empty state as the
   result set changes.

   There is no backend yet, so all data lives in the DOM already
   rendered by saved-reports.html. Every spot that will need a real
   request later is marked // BACKEND HOOK.
   ========================================================================== */

(function () {
  'use strict';

  var searchInput = document.getElementById('savedReportsSearch');
  var filterChips = document.querySelectorAll('.filter-chip');
  var sortSelect = document.getElementById('savedReportsSort');
  var grid = document.getElementById('savedReportsGrid');
  var emptyState = document.getElementById('savedReportsEmpty');

  if (!grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.report-card'));
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state = {
    search: '',
    filter: 'all',
    sort: 'recent'
  };

  var MONTHS = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  /* ------------------------------------------------------------------
     DATA READERS
     Pulls sortable/filterable values straight out of each card's
     rendered text, since there's no backend payload to read from yet.
     ------------------------------------------------------------------ */
  function getCardName(card) {
    var el = card.querySelector('.report-card__name');
    return el ? el.textContent.trim() : '';
  }

  function getCardScore(card) {
    var el = card.querySelector('.report-card__score-value');
    if (!el) return 0;
    var match = el.textContent.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  function getCardDate(card) {
    var el = card.querySelector('.report-card__date');
    if (!el) return new Date(0);
    // Expected format: "Saved 16 Jul 2026"
    var match = el.textContent.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
    if (!match) return new Date(0);
    var day = parseInt(match[1], 10);
    var month = MONTHS[match[2].toLowerCase()] || 0;
    var year = parseInt(match[3], 10);
    return new Date(year, month, day);
  }

  /* ------------------------------------------------------------------
     SMOOTH SHOW / HIDE
     .is-hidden (display: none) is defined in saved-reports.css, but a
     hard display toggle has no animation. This fades opacity/scale
     first, then applies .is-hidden after the transition finishes --
     and does the reverse when a card reappears.
     ------------------------------------------------------------------ */
  function showCard(card) {
    if (!card.classList.contains('is-hidden')) return;
    card.classList.remove('is-hidden');
    if (prefersReducedMotion) return;
    card.style.opacity = '0';
    card.style.transform = 'translateY(6px) scale(0.98)';
    card.style.transition = 'none';
    void card.offsetHeight; // force reflow before re-enabling transition
    card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    requestAnimationFrame(function () {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0) scale(1)';
    });
  }

  function hideCard(card) {
    if (card.classList.contains('is-hidden')) return;
    if (prefersReducedMotion) {
      card.classList.add('is-hidden');
      return;
    }
    card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    card.style.opacity = '0';
    card.style.transform = 'translateY(6px) scale(0.98)';
    setTimeout(function () {
      card.classList.add('is-hidden');
    }, 200);
  }

  /* ------------------------------------------------------------------
     FILTER + SEARCH
     ------------------------------------------------------------------ */
  function cardMatches(card) {
    var matchesFilter = state.filter === 'all' || card.getAttribute('data-recommendation') === state.filter;
    var matchesSearch = !state.search || getCardName(card).toLowerCase().indexOf(state.search) !== -1;
    return matchesFilter && matchesSearch;
  }

  function applyFilters() {
    var visibleCount = 0;

    cards.forEach(function (card) {
      if (cardMatches(card)) {
        showCard(card);
        visibleCount++;
      } else {
        hideCard(card);
      }
    });

    toggleEmptyState(visibleCount === 0);
  }

  function toggleEmptyState(isEmpty) {
    if (!emptyState) return;

    if (isEmpty) {
      grid.setAttribute('hidden', '');
      emptyState.removeAttribute('hidden');
      if (!prefersReducedMotion) {
        emptyState.style.opacity = '0';
        requestAnimationFrame(function () {
          emptyState.style.transition = 'opacity 0.3s ease';
          emptyState.style.opacity = '1';
        });
      }
    } else {
      grid.removeAttribute('hidden');
      emptyState.setAttribute('hidden', '');
    }
  }

  function initSearch() {
    if (!searchInput) return;
    searchInput.addEventListener('input', function () {
      // BACKEND HOOK: once reports are paginated server-side, debounce
      // this and call /api/reports/saved?query=... instead of filtering
      // the DOM directly.
      state.search = searchInput.value.trim().toLowerCase();
      applyFilters();
    });
  }

  function initFilterChips() {
    if (!filterChips.length) return;
    filterChips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        filterChips.forEach(function (c) {
          c.classList.remove('is-active');
        });
        chip.classList.add('is-active');
        state.filter = chip.getAttribute('data-filter') || 'all';
        applyFilters();
      });
    });
  }

  /* ------------------------------------------------------------------
     SORT
     Reorders the actual DOM nodes inside the grid; re-appending an
     existing element moves it rather than duplicating it.
     ------------------------------------------------------------------ */
  function applySort() {
    var sorted = cards.slice();

    switch (state.sort) {
      case 'oldest':
        sorted.sort(function (a, b) { return getCardDate(a) - getCardDate(b); });
        break;
      case 'score-high':
        sorted.sort(function (a, b) { return getCardScore(b) - getCardScore(a); });
        break;
      case 'score-low':
        sorted.sort(function (a, b) { return getCardScore(a) - getCardScore(b); });
        break;
      case 'name':
        sorted.sort(function (a, b) { return getCardName(a).localeCompare(getCardName(b)); });
        break;
      case 'recent':
      default:
        sorted.sort(function (a, b) { return getCardDate(b) - getCardDate(a); });
        break;
    }

    sorted.forEach(function (card) {
      grid.appendChild(card);
    });
  }

  function initSort() {
    if (!sortSelect) return;
    sortSelect.addEventListener('change', function () {
      // BACKEND HOOK: once reports are paginated server-side, request
      // /api/reports/saved?sort=... instead of re-sorting the DOM.
      state.sort = sortSelect.value;
      applySort();
    });
  }

  /* ------------------------------------------------------------------
     DELETE (confirmation only -- no backend yet)
     ------------------------------------------------------------------ */
  function initDeleteButtons() {
    grid.addEventListener('click', function (e) {
      var deleteBtn = e.target.closest('[data-action="delete-report"]');
      if (!deleteBtn) return;

      var card = deleteBtn.closest('.report-card');
      if (!card) return;

      var companyName = getCardName(card) || 'this company';
      var confirmed = window.confirm('Delete the saved report for ' + companyName + '? This cannot be undone.');
      if (!confirmed) return;

      // BACKEND HOOK: DELETE /api/reports/saved/:id, then remove the
      // card from the DOM only after the server confirms deletion.
      removeCard(card);
    });
  }

  function removeCard(card) {
    if (prefersReducedMotion) {
      finishRemoveCard(card);
      return;
    }
    card.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.96)';
    setTimeout(function () {
      finishRemoveCard(card);
    }, 250);
  }

  function finishRemoveCard(card) {
    var index = cards.indexOf(card);
    if (index !== -1) cards.splice(index, 1);
    card.remove();

    var visibleCount = cards.filter(function (c) {
      return !c.classList.contains('is-hidden');
    }).length;
    toggleEmptyState(visibleCount === 0);
  }

  /* ------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    initSearch();
    initFilterChips();
    initSort();
    initDeleteButtons();
    applySort();
    applyFilters();
  });
})();
