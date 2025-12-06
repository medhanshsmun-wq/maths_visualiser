/**
 * Toast Notification System
 * Professional notifications with animations
 */

let container = null;
let toastCounter = 0;

const TOAST_DURATION = 4000;
const ANIMATION_DURATION = 300;

/**
 * Initialize notification container
 */
function initContainer() {
  if (container) return;

  container = document.createElement('div');
  container.className = 'toast-container';
  document.body.appendChild(container);
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - Type: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in ms (optional)
 */
export function showToast(message, type = 'info', duration = TOAST_DURATION) {
  initContainer();

  const id = `toast-${toastCounter++}`;
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  const toast = document.createElement('div');
  toast.id = id;
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-message">${escapeHtml(message)}</div>
    <button class="toast-close" aria-label="Close">✕</button>
  `;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('toast-show');
  });

  // Close button
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => dismissToast(id));

  // Auto dismiss
  if (duration > 0) {
    setTimeout(() => dismissToast(id), duration);
  }

  return id;
}

/**
 * Dismiss a toast
 */
export function dismissToast(id) {
  const toast = document.getElementById(id);
  if (!toast) return;

  toast.classList.remove('toast-show');
  toast.classList.add('toast-hide');

  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, ANIMATION_DURATION);
}

/**
 * Show success notification
 */
export function showSuccess(message, duration) {
  return showToast(message, 'success', duration);
}

/**
 * Show error notification
 */
export function showError(message, duration) {
  return showToast(message, 'error', duration);
}

/**
 * Show warning notification
 */
export function showWarning(message, duration) {
  return showToast(message, 'warning', duration);
}

/**
 * Show info notification
 */
export function showInfo(message, duration) {
  return showToast(message, 'info', duration);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Clear all toasts
 */
export function clearAllToasts() {
  if (!container) return;

  const toasts = container.querySelectorAll('.toast');
  toasts.forEach(toast => {
    dismissToast(toast.id);
  });
}
