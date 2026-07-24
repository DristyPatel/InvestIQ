document.addEventListener('DOMContentLoaded', function () {
'use strict';

var form = document.getElementById('profileForm');
var editBtn = document.getElementById('editProfileBtn');
var cancelBtn = document.getElementById('cancelProfileBtn');
var actions = document.getElementById('profileFormActions');

if (!form || !editBtn) return;

var editableFields = form.querySelectorAll('.form-input');
var originalValues = {};
var isEditing = false;
var hasUnsavedChanges = false;

function snapshotValues() {
originalValues = {};
editableFields.forEach(function (field) {
originalValues[field.name] = field.value;
});
}

function restoreValues() {
editableFields.forEach(function (field) {
if (originalValues.hasOwnProperty(field.name)) {
field.value = originalValues[field.name];
}
clearFieldError(field);
});
}

function setFieldsEditable(editable) {
editableFields.forEach(function (field) {
if (field.tagName === 'SELECT') {
field.disabled = !editable;
} else {
if (editable) {
field.removeAttribute('readonly');
} else {
field.setAttribute('readonly', '');
}
}
});
}

function setFieldError(field) {
field.classList.add('is-invalid');
}

function clearFieldError(field) {
field.classList.remove('is-invalid');
}

function isValidEmail(value) {
return /^[^\s@]+@[^\s@]+.[^\s@]+$/.test(value.trim());
}

function validateForm() {
var isValid = true;

editableFields.forEach(function (field) {
  clearFieldError(field);
  var value = field.value.trim();

  if (!value) {
    setFieldError(field);
    isValid = false;
    return;
  }

  if (field.type === 'email' && !isValidEmail(value)) {
    setFieldError(field);
    isValid = false;
  }
});

return isValid;

}

function enterEditMode() {
isEditing = true;
hasUnsavedChanges = false;
snapshotValues();
setFieldsEditable(true);
form.classList.add('is-editing');
if (actions) actions.hidden = false;
editBtn.hidden = true;

var firstField = form.querySelector('.form-input:not([disabled])');
if (firstField) firstField.focus();

trackChanges();

}

function exitEditMode() {
isEditing = false;
hasUnsavedChanges = false;
setFieldsEditable(false);
form.classList.remove('is-editing');
if (actions) actions.hidden = true;
editBtn.hidden = false;
}

function trackChanges() {
editableFields.forEach(function (field) {
field.addEventListener('input', function () {
if (!isEditing) return;
hasUnsavedChanges = field.value !== originalValues[field.name];
});
field.addEventListener('change', function () {
if (!isEditing) return;
hasUnsavedChanges = field.value !== originalValues[field.name];
});
});
}

editBtn.addEventListener('click', function () {
enterEditMode();
});

if (cancelBtn) {
cancelBtn.addEventListener('click', function () {
if (hasUnsavedChanges) {
var confirmed = window.confirm('You have unsaved changes. Discard them?');
if (!confirmed) return;
}
restoreValues();
exitEditMode();
});
}

form.addEventListener('submit', function (e) {
e.preventDefault();

if (!validateForm()) {
  showToast('Please fill in all required fields correctly.', 'error');
  return;
}

var saveBtn = form.querySelector('[data-action="save-profile"]');
var label = saveBtn ? saveBtn.querySelector('.btn-label') : null;
var originalLabel = label ? label.textContent : '';

if (saveBtn) saveBtn.disabled = true;
if (label) label.textContent = 'Saving...';

// BACKEND HOOK: PUT the updated profile fields to /api/profile,
// then only exit edit mode once the server confirms the save.
setTimeout(function () {
  if (label) label.textContent = originalLabel;
  if (saveBtn) saveBtn.disabled = false;

  exitEditMode();
  showToast('Profile updated successfully.', 'success');
}, 900);

});

window.addEventListener('beforeunload', function (e) {
if (isEditing && hasUnsavedChanges) {
e.preventDefault();
e.returnValue = '';
return '';
}
});

function showToast(message, type) {
var existing = document.getElementById('profileToast');
if (existing) existing.remove();

var toast = document.createElement('div');
toast.id = 'profileToast';
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

setFieldsEditable(false);
if (actions) actions.hidden = true;
});
