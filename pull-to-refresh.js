(() => {
  'use strict';

  // A soft refresh keeps the current view mounted, including event handlers
  // and in-progress activity state. Progress is saved before sync is requested.
  if (window.LittleLearnersPullRefreshInstalled) return;
  window.LittleLearnersPullRefreshInstalled = true;

  const THRESHOLD = 76;
  let startY = 0;
  let tracking = false;
  let refreshing = false;
  let indicator;
  let messageTimer;

  function getIndicator() {
    if (indicator) return indicator;
    indicator = document.createElement('div');
    indicator.className = 'll-pull-refresh-indicator';
    indicator.setAttribute('role', 'status');
    indicator.setAttribute('aria-live', 'polite');
    indicator.textContent = '↓ Pull to refresh';
    document.body.append(indicator);
    return indicator;
  }

  function show(text, state = '') {
    const node = getIndicator();
    node.textContent = text;
    node.dataset.state = state;
    node.classList.add('visible');
  }

  function hideSoon() {
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => indicator?.classList.remove('visible'), 1800);
  }

  async function refreshCurrentScreen() {
    if (refreshing) return;
    refreshing = true;
    show('↻ Refreshing LittleLearners…', 'refreshing');

    try {
      const resources = [
        './content/learning-stages.json',
        './content/grade-1-reading-practice.json',
        './content/stage-learning-activities.json'
      ];
      const results = await Promise.allSettled(resources.map(async url => {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error('Refresh request failed');
        return response;
      }));
      const failed = results.some(result => result.status === 'rejected');

      // Check for an updated app shell without replacing the current view.
      try {
        const registration = await navigator.serviceWorker?.getRegistration();
        if (registration) await registration.update();
      } catch (_) {}

      // Preserve local progress and ask configured cloud sync to flush pending work.
      try { window.kl?.save?.(); } catch (_) {}
      try { window.fb?.schedulePush?.(); } catch (_) {}

      show(failed ? 'Refresh checked — some content needs a connection' : '✓ You’re up to date', failed ? 'warning' : 'success');
    } catch (_) {
      show('Refresh unavailable — your progress is safe', 'warning');
    } finally {
      refreshing = false;
      hideSoon();
    }
  }

  document.addEventListener('touchstart', event => {
    if (refreshing || event.touches.length !== 1) {
      tracking = false;
      return;
    }
    const scrollTop = document.scrollingElement?.scrollTop || window.scrollY || 0;
    const target = event.target;
    if (scrollTop > 0 || target?.closest?.('input, textarea, select, [contenteditable="true"]')) {
      tracking = false;
      return;
    }
    startY = event.touches[0].clientY;
    tracking = startY <= 80;
  }, { passive: true });

  document.addEventListener('touchmove', event => {
    if (!tracking || refreshing || event.touches.length !== 1) return;
    const delta = event.touches[0].clientY - startY;
    if (delta <= 0) return;
    if (delta > 12) {
      const node = getIndicator();
      node.textContent = delta >= THRESHOLD ? '↑ Release to refresh' : '↓ Pull to refresh';
      node.classList.add('visible');
    }
    if (delta >= THRESHOLD) event.preventDefault();
  }, { passive: false });

  document.addEventListener('touchend', event => {
    if (!tracking) return;
    const endY = event.changedTouches?.[0]?.clientY ?? startY;
    const delta = endY - startY;
    tracking = false;
    if (delta >= THRESHOLD && (document.scrollingElement?.scrollTop || window.scrollY || 0) <= 0) {
      refreshCurrentScreen();
    } else if (indicator && !refreshing) {
      hideSoon();
    }
  }, { passive: true });

  document.addEventListener('touchcancel', () => {
    tracking = false;
    if (!refreshing) hideSoon();
  }, { passive: true });
})();
