/* ==========================================================================
   COMPANY-RESEARCH.JS
   --------------------------------------------------------------------------
   Behavior for company-research.html only. dashboard.js (loaded first)
   already handles the sidebar drawer, notification/user dropdowns, and
   the topbar date -- this file only adds what's specific to this page:
   search, trending company selection, the AI confidence meter, chart
   replay animations, and the four action buttons.

   There is no backend yet, so "searching" a company swaps in data from
   a small local lookup table (COMPANY_DB below) instead of calling an
   API. Every spot that will need a real fetch() later is marked
   // BACKEND HOOK.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     LOCAL COMPANY LOOKUP
     Stand-in for a real /api/company/:ticker response. Keyed by the
     lowercase name used in each chip's data-company attribute and in
     the search input.
     ------------------------------------------------------------------ */
  var COMPANY_DB = {
    apple: {
      logo: 'AP', name: 'Apple Inc.', ticker: 'NASDAQ: AAPL', risk: 'Low Risk', riskClass: 'badge--low',
      industry: 'Consumer Technology', ceo: 'Tim Cook', hq: 'Cupertino, California',
      marketCap: '$2.94T', price: '$192.35', high: '$212.80', low: '$164.10',
      revenue: '$383B', profit: '$97B', eps: '$6.13', pe: '31.4x', de: '1.47', roe: '147%',
      confidence: 91
    },
    microsoft: {
      logo: 'MS', name: 'Microsoft Corp.', ticker: 'NASDAQ: MSFT', risk: 'Low Risk', riskClass: 'badge--low',
      industry: 'Enterprise Software & Cloud', ceo: 'Satya Nadella', hq: 'Redmond, Washington',
      marketCap: '$3.11T', price: '$418.20', high: '$430.60', low: '$362.90',
      revenue: '$245B', profit: '$88B', eps: '$11.80', pe: '35.2x', de: '0.42', roe: '38%',
      confidence: 94
    },
    google: {
      logo: 'GO', name: 'Alphabet Inc.', ticker: 'NASDAQ: GOOGL', risk: 'Low Risk', riskClass: 'badge--low',
      industry: 'Internet & Advertising', ceo: 'Sundar Pichai', hq: 'Mountain View, California',
      marketCap: '$2.18T', price: '$178.40', high: '$191.75', low: '$130.10',
      revenue: '$307B', profit: '$74B', eps: '$5.80', pe: '26.1x', de: '0.11', roe: '29%',
      confidence: 88
    },
    amazon: {
      logo: 'AM', name: 'Amazon.com Inc.', ticker: 'NASDAQ: AMZN', risk: 'Medium Risk', riskClass: 'badge--medium',
      industry: 'E-Commerce & Cloud', ceo: 'Andy Jassy', hq: 'Seattle, Washington',
      marketCap: '$1.92T', price: '$182.10', high: '$201.20', low: '$144.05',
      revenue: '$575B', profit: '$30B', eps: '$2.90', pe: '42.7x', de: '0.98', roe: '19%',
      confidence: 79
    },
    tesla: {
      logo: 'TS', name: 'Tesla Inc.', ticker: 'NASDAQ: TSLA', risk: 'Medium Risk', riskClass: 'badge--medium',
      industry: 'Automotive & Energy', ceo: 'Elon Musk', hq: 'Austin, Texas',
      marketCap: '$780B', price: '$242.60', high: '$299.30', low: '$152.40',
      revenue: '$97B', profit: '$8.4B', eps: '$2.42', pe: '68.3x', de: '0.18', roe: '11%',
      confidence: 64
    },
    nvidia: {
      logo: 'NV', name: 'NVIDIA Corp.', ticker: 'NASDAQ: NVDA', risk: 'Low Risk', riskClass: 'badge--low',
      industry: 'Semiconductors & AI', ceo: 'Jensen Huang', hq: 'Santa Clara, California',
      marketCap: '$3.36T', price: '$137.90', high: '$153.20', low: '$75.60',
      revenue: '$96B', profit: '$45B', eps: '$1.82', pe: '58.9x', de: '0.24', roe: '91%',
      confidence: 95
    }
  };

  /* ------------------------------------------------------------------
     ELEMENT REFERENCES
     ------------------------------------------------------------------ */
  var searchForm = document.getElementById('companySearchForm');
  var searchInput = document.getElementById('companySearchInput');
  var voiceBtn = document.getElementById('voiceSearchBtn');
  var overviewPanel = document.querySelector('.company-overview');
  var aiPanel = document.querySelector('.ai-insight-panel');
  var confidenceFill = document.getElementById('confidenceFill');
  var confidenceValue = document.getElementById('confidenceValue');

  /* ------------------------------------------------------------------
     RESTART A CSS ANIMATION
     Browsers only play a CSS animation once per element unless the
     animation property is reset. This forces a reflow between removing
     and re-applying it, which is the standard vanilla-JS trick for
     replaying chart-draw / gauge-fill style animations on demand.
     ------------------------------------------------------------------ */
  function replayAnimation(el) {
    if (!el) return;
    el.style.animation = 'none';
    // Reading offsetHeight forces the browser to flush layout, which
    // is what makes the animation actually restart on the next line.
    void el.offsetHeight;
    el.style.animation = '';
  }

  function replayChartsIn(container) {
    if (!container) return;
    container.querySelectorAll('.chart-line, .chart-fill, .donut-segment, .gauge-arc').forEach(replayAnimation);
  }

  /* ------------------------------------------------------------------
     CONFIDENCE METER
     Fills in once on first scroll-into-view, and replays whenever a
     new company is loaded.
     ------------------------------------------------------------------ */
  function playConfidenceMeter(score) {
    if (!confidenceFill) return;
    var target = typeof score === 'number' ? score : 91;

    confidenceFill.style.setProperty('--confidence-target', target + '%');
    confidenceFill.classList.remove('is-filled');
    void confidenceFill.offsetHeight;

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    confidenceFill.classList.add('is-filled');

    if (!confidenceValue) return;

    if (prefersReducedMotion) {
      confidenceValue.textContent = target + '%';
      return;
    }

    var duration = 1200;
    var startTime = null;
    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      confidenceValue.textContent = Math.floor(eased * target) + '%';
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        confidenceValue.textContent = target + '%';
      }
    }
    requestAnimationFrame(step);
  }

  function initConfidenceMeterOnScroll() {
    if (!confidenceFill) return;
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            playConfidenceMeter(91);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(confidenceFill);
  }

  /* ------------------------------------------------------------------
     APPLY COMPANY DATA TO THE PAGE
     Writes a matched COMPANY_DB entry into the overview card and the
     financial summary stat cards.
     ------------------------------------------------------------------ */
  function applyCompanyToPage(company) {
    if (!overviewPanel) return;

    var logoEl = overviewPanel.querySelector('.company-overview__logo');
    var nameEl = overviewPanel.querySelector('.company-overview__name');
    var tickerEl = overviewPanel.querySelector('.company-overview__ticker');
    var riskBadge = overviewPanel.querySelector('.company-overview__top .badge');
    var values = overviewPanel.querySelectorAll('.company-overview__value');

    if (logoEl) logoEl.textContent = company.logo;
    if (nameEl) nameEl.textContent = company.name;
    if (tickerEl) tickerEl.textContent = company.ticker;
    if (riskBadge) {
      riskBadge.textContent = company.risk;
      riskBadge.className = 'badge ' + company.riskClass;
    }

    // Overview fields appear in a fixed order in the markup: Industry,
    // CEO, Headquarters, Market Cap, Current Price, 52W High, 52W Low.
    var overviewOrder = [company.industry, company.ceo, company.hq, company.marketCap, company.price, company.high, company.low];
    values.forEach(function (el, i) {
      if (overviewOrder[i] !== undefined) el.textContent = overviewOrder[i];
    });

    // Financial summary cards, in DOM order: Revenue, Net Profit, EPS,
    // PE Ratio, Debt to Equity, ROE.
    var statValues = document.querySelectorAll('.financial-summary .stat-card__value');
    var financials = [company.revenue, company.profit, company.eps, company.pe, company.de, company.roe];
    statValues.forEach(function (el, i) {
      if (financials[i] !== undefined) el.textContent = financials[i];
    });

    playConfidenceMeter(company.confidence);
    replayChartsIn(document.querySelector('.charts-grid--triple'));
  }

  /* ------------------------------------------------------------------
     SIMULATED "SEARCH" / LOADING STATE
     Re-applies the .skeleton shimmer (already styled in dashboard.css)
     to the overview, AI panel, and chart cards briefly before revealing
     the matched (or unchanged) company data -- standing in for a real
     network request.
     ------------------------------------------------------------------ */
  function runSearch(query) {
    if (!query) return;
    var key = query.trim().toLowerCase();
    var company = COMPANY_DB[key];

    var skeletonTargets = document.querySelectorAll('.company-overview, .ai-insight-panel, .charts-grid--triple .panel');

    skeletonTargets.forEach(function (el) {
      el.classList.add('skeleton');
    });

    // BACKEND HOOK: replace this timeout with a real
    // fetch(`/api/company/${encodeURIComponent(query)}`) call once the
    // Flask backend exists; remove `.skeleton` and call
    // applyCompanyToPage() inside the `.then()` instead.
    setTimeout(function () {
      skeletonTargets.forEach(function (el) {
        el.classList.remove('skeleton');
      });

      if (company) {
        applyCompanyToPage(company);
      } else {
        // Unknown query: keep whatever company is currently displayed,
        // but still replay the charts/confidence meter so the search
        // still feels responsive even without a real match.
        playConfidenceMeter(91);
        replayChartsIn(document.querySelector('.charts-grid--triple'));
      }
    }, 850);
  }

  function initSearchForm() {
    if (!searchForm || !searchInput) return;
    searchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      runSearch(searchInput.value);
    });
  }

  /* ------------------------------------------------------------------
     VOICE SEARCH PLACEHOLDER
     No real speech recognition wired up yet -- just a visible pressed
     state so the icon feels interactive rather than dead.
     ------------------------------------------------------------------ */
  function initVoiceSearch() {
    if (!voiceBtn) return;
    voiceBtn.addEventListener('click', function () {
      voiceBtn.classList.add('is-listening');
      voiceBtn.style.color = 'var(--color-primary)';
      // BACKEND HOOK: wire up the real Web Speech API (or a server-side
      // transcription endpoint) here, then call runSearch() with the
      // transcribed text once available.
      setTimeout(function () {
        voiceBtn.classList.remove('is-listening');
        voiceBtn.style.color = '';
      }, 1200);
    });
  }

  /* ------------------------------------------------------------------
     TRENDING / POPULAR COMPANY CHIPS
     ------------------------------------------------------------------ */
  function initCompanyChips() {
    document.querySelectorAll('.search-chip[data-company]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var name = chip.getAttribute('data-company');
        if (searchInput) searchInput.value = name;
        runSearch(name);
      });
    });
  }

  /* ------------------------------------------------------------------
     ACTION BUTTONS
     Generate AI Report / Compare Company / Save Research / Export PDF.
     Each swaps its label briefly to confirm the click, then reverts --
     all four are marked as BACKEND HOOKs for their real Flask-backed
     behavior later.
     ------------------------------------------------------------------ */
  function runButtonFeedback(btn, busyText, doneText, busyMs, doneMs) {
    var label = btn.querySelector('.btn-label');
    if (!label) return;
    var originalText = label.textContent;

    btn.disabled = true;
    btn.style.opacity = '0.75';
    label.textContent = busyText;

    setTimeout(function () {
      label.textContent = doneText;
      setTimeout(function () {
        label.textContent = originalText;
        btn.disabled = false;
        btn.style.opacity = '';
      }, doneMs);
    }, busyMs);
  }

  function initActionButtons() {
    var generateBtn = document.querySelector('[data-action="generate-report"]');
    var compareBtn = document.querySelector('[data-action="compare-company"]');
    var saveBtn = document.querySelector('[data-action="save-research"]');
    var exportBtn = document.querySelector('[data-action="export-pdf"]');

    if (generateBtn) {
      generateBtn.addEventListener('click', function () {
        // BACKEND HOOK: POST to /api/reports/generate with the current
        // company ticker, then redirect to the generated report.
        runButtonFeedback(generateBtn, 'Generating...', 'Report Ready ✓', 1400, 1400);
      });
    }

    if (compareBtn) {
      compareBtn.addEventListener('click', function () {
        // BACKEND HOOK: open the company comparison view, pre-filled
        // with the currently loaded company as the first slot.
        runButtonFeedback(compareBtn, 'Opening...', 'Ready to Compare', 700, 1200);
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        // BACKEND HOOK: POST to /api/research/save for the signed-in user.
        runButtonFeedback(saveBtn, 'Saving...', 'Saved ✓', 700, 1400);
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        // BACKEND HOOK: request a server-generated PDF from
        // /api/reports/export and trigger its download.
        runButtonFeedback(exportBtn, 'Exporting...', 'Downloaded ✓', 1000, 1400);
      });
    }
  }

  /* ------------------------------------------------------------------
     DEEP LINK FROM OTHER PAGES
     dashboard.js sends users here with a `?company=Apple`-style query
     string (from the Quick Actions, report table, and recent-search
     chips). If present, run that search automatically on load so the
     page doesn't just land on the default company.
     ------------------------------------------------------------------ */
  function initDeepLinkCompany() {
    var params = new URLSearchParams(window.location.search);
    var company = params.get('company');
    if (!company) return;
    if (searchInput) searchInput.value = company;
    runSearch(company);
  }

  /* ------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    initSearchForm();
    initVoiceSearch();
    initCompanyChips();
    initActionButtons();
    initConfidenceMeterOnScroll();
    initDeepLinkCompany();
  });
})();