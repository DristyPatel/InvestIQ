document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var form = document.getElementById('settingsForm');
  if (!form) return;

  var saveBtn = form.querySelector('[data-action="save-settings"]');
  var resetBtn = form.querySelector('[data-action="reset-settings"]');
  var newPassword = document.getElementById('newPassword');
  var confirmNewPassword = document.getElementById('confirmNewPassword');
  var currentPassword = document.getElementById('currentPassword');

  var trackedFields = Array.prototype.slice.call(
    form.querySelectorAll('input[name], select[name], textarea[name]')
  );

  var defaultState = {};
  var hasUnsavedChanges = false;

  function fieldValue(field) {
    if (field.type === 'checkbox' || field.type === 'radio') {
      return field.checked;
    }
    return field.value;
  }

  function snapshotDefaults() {
    defaultState = {};
    trackedFields.forEach(function (field) {
      var key = field.name + (field.type === 'radio' ? ':' + field.value : '');
      defaultState[key] = fieldValue(field);
    });
  }

  function applyField(field, value) {
    if (field.type === 'checkbox' || field.type === 'radio') {
      field.checked = value;
    } else {
      field.value = value;
    }
  }

  function markDirty() {
    hasUnsavedChanges = true;
  }

  function trackChanges() {
    trackedFields.forEach(function (field) {
      var evt = field.tagName === 'SELECT' || field.type === 'checkbox' || field.type === 'radio' ? 'change' : 'input';
      field.addEventListener(evt, markDirty);
    });
  }

  /* ------------------------------------------------------------------
     PASSWORD VISIBILITY TOGGLE
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
     VALIDATION
     ------------------------------------------------------------------ */
  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function setFieldError(field) {
    field.classList.add('is-invalid');
  }

  function clearFieldError(field) {
    field.classList.remove('is-invalid');
  }

  function validateForm() {
    var isValid = true;
    var email = document.getElementById('settingsEmail');
    var username = document.getElementById('settingsUsername');

    [email, username, currentPassword, newPassword, confirmNewPassword].forEach(function (field) {
      if (field) clearFieldError(field);
    });

    if (email) {
      if (!email.value.trim()) {
        setFieldError(email);
        isValid = false;
      } else if (!isValidEmail(email.value)) {
        setFieldError(email);
        isValid = false;
      }
    }

    if (username && !username.value.trim()) {
      setFieldError(username);
      isValid = false;
    }

    var wantsPasswordChange =
      (newPassword && newPassword.value) ||
      (confirmNewPassword && confirmNewPassword.value) ||
      (currentPassword && currentPassword.value);

    if (wantsPasswordChange) {
      if (!currentPassword || !currentPassword.value) {
        if (currentPassword) setFieldError(currentPassword);
        isValid = false;
      }
      if (!newPassword || newPassword.value.length < 8) {
        if (newPassword) setFieldError(newPassword);
        isValid = false;
      }
      if (!confirmNewPassword || confirmNewPassword.value !== (newPassword ? newPassword.value : '')) {
        if (confirmNewPassword) setFieldError(confirmNewPassword);
        isValid = false;
      }
    }

    return isValid;
  }

  /* ------------------------------------------------------------------
     SAVE SETTINGS
     ------------------------------------------------------------------ */
  function setButtonLoading(btn, isLoading, busyText) {
    if (!btn) return;
    var label = btn.querySelector('.btn-label');
    if (!label) return;
    if (isLoading) {
      btn.dataset.originalLabel = label.textContent;
      label.textContent = busyText;
      btn.disabled = true;
      btn.style.opacity = '0.75';
    } else {
      label.textContent = btn.dataset.originalLabel || label.textContent;
      btn.disabled = false;
      btn.style.opacity = '';
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Please fix the highlighted fields and try again.', 'error');
      return;
    }

    setButtonLoading(saveBtn, true, 'Saving...');

    // BACKEND HOOK: PUT the full settings payload to /api/settings,
    // only clearing the password fields and dirty state once the
    // server confirms the save succeeded.
    setTimeout(function () {
      setButtonLoading(saveBtn, false);
      hasUnsavedChanges = false;
      snapshotDefaults();

      if (currentPassword) currentPassword.value = '';
      if (newPassword) newPassword.value = '';
      if (confirmNewPassword) confirmNewPassword.value = '';

      showToast('Settings saved successfully.', 'success');
    }, 900);
  });

  /* ------------------------------------------------------------------
     RESET TO DEFAULT
     ------------------------------------------------------------------ */
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      var confirmed = window.confirm('Reset all settings to their default values? Unsaved changes will be lost.');
      if (!confirmed) return;

      trackedFields.forEach(function (field) {
        var key = field.name + (field.type === 'radio' ? ':' + field.value : '');
        if (defaultState.hasOwnProperty(key)) {
          applyField(field, defaultState[key]);
        }
        clearFieldError(field);
      });

      if (currentPassword) currentPassword.value = '';
      if (newPassword) newPassword.value = '';
      if (confirmNewPassword) confirmNewPassword.value = '';

      hasUnsavedChanges = false;
      showToast('Settings reset to default.', 'success');
    });
  }

  /* ------------------------------------------------------------------
     UNSAVED CHANGES WARNING
     ------------------------------------------------------------------ */
  window.addEventListener('beforeunload', function (e) {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  });

  /* ------------------------------------------------------------------
     TOAST
     ------------------------------------------------------------------ */
  function showToast(message, type) {
    var existing = document.getElementById('settingsToast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'settingsToast';
    toast.setAttribute('role', 'status');
    toast.textContent = message;

    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.left = '50%';
    toast.style.transform = 'translate(-50%, 12px)';
    toast.style.zIndex = '999';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = 'var(--radius-sm)';
    toast.style.fontFamily = 'var(--font-body)';
    toast.style.fontSize = 'var(--fs-sm)';
    toast.style.fontWeight = 'var(--fw-medium)';
    toast.style.boxShadow = 'var(--shadow-lg)';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';

    if (type === 'error') {
      toast.style.background = 'var(--color-danger-bg)';
      toast.style.color = '#991b1b';
    } else {
      toast.style.background = 'var(--color-success-bg)';
      toast.style.color = '#166534';
    }

    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.style.opacity = '1';
      toast.style.transform = 'translate(-50%, 0)';
    });

    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%, 12px)';
      setTimeout(function () {
        toast.remove();
      }, 250);
    }, 2600);
  }

  /* ------------------------------------------------------------------
     DANGER ZONE
     "Deactivate Account" and "Log Out Other Sessions" had no handler
     at all before -- clicking did nothing. Deactivating ends the local
     session and returns to the landing page, same as Logout, since
     there's no backend yet to actually flag the account as disabled.
     Logging out other sessions has no other sessions to act on in a
     frontend-only build, so it just confirms the action via toast.

     BACKEND HOOK: POST to /api/account/deactivate and
     /api/sessions/revoke-others respectively once Flask exists.
     ------------------------------------------------------------------ */
  function initDangerZone() {
    var deactivateBtn = form.querySelector('[data-action="deactivate-account"]');
    var logoutSessionsBtn = form.querySelector('[data-action="logout-sessions"]');

    if (deactivateBtn) {
      deactivateBtn.addEventListener('click', function () {
        var confirmed = window.confirm(
          'Deactivate your InvestIQ account? You can reactivate anytime by logging back in.'
        );
        if (!confirmed) return;

        localStorage.removeItem('investiq_auth');
        localStorage.removeItem('investiq_user');
        window.location.href = 'index.html';
      });
    }

    if (logoutSessionsBtn) {
      logoutSessionsBtn.addEventListener('click', function () {
        showToast('All other sessions have been signed out.', 'success');
      });
    }
  }

  initPasswordToggles();
  snapshotDefaults();
  trackChanges();
  initDangerZone();
});
