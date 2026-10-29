(() => {
  'use strict';
  const root = () => document.querySelector('#app');
  let lastScreen = '';
  let handlingBack = false;

  function screenKey() {
    const app = root();
    if (!app) return '';
    if (document.body.classList.contains('ob')) return 'onboarding';
    if (app.querySelector('.home-grid')) return 'home';
    if (app.querySelector('.learning-path-options')) return 'learning-activity:' + (app.querySelector('h2')?.textContent || '');
    if (app.querySelector('.learning-path-list')) return 'learning-path';
    if (app.querySelector('.reading-shell')) return 'reading:' + (app.querySelector('h1,h2')?.textContent || '');
    if (app.querySelector('.category-bar')) return 'category:' + (app.querySelector('.category-title')?.textContent || '');
    if (/Round\s+\d+\//.test(app.textContent)) return 'quiz:' + (app.querySelector('.bar h2')?.textContent || '');
    if (app.querySelector('.parent-settings')) return 'parents';
    if (app.querySelector('.profile-list')) return 'profiles';
    if (app.querySelector('.st')) return 'stickers';
    const heading = app.querySelector('h1,h2');
    return heading ? 'screen:' + heading.textContent.trim() : '';
  }

  function pushScreen(key) {
    if (!key || key === lastScreen) return;
    lastScreen = key;
    if (handlingBack) return;
    try { history.pushState({ littleLearnersScreen: key }, '', location.href); } catch (_) {}
  }

  function backControl() {
    const app = root();
    if (!app) return null;
    const preferred = app.querySelector('.bar button.btn.o');
    if (preferred && !preferred.disabled) return preferred;
    const candidates = [...app.querySelectorAll('button')];
    return candidates.find(button => {
      const label = (button.getAttribute('aria-label') || button.textContent || '').trim();
      return /^(⬅\s*)?(home|back|back to activities|story library|close)$/i.test(label);
    }) || null;
  }

  function observeScreen() {
    const key = screenKey();
    if (!key || key === lastScreen) return;
    pushScreen(key);
  }

  // Keep one history entry per meaningful in-app screen. Android back gestures,
  // hardware back, and browser Back therefore reach the previous view first.
  try { history.replaceState({ littleLearnersScreen: screenKey() || 'home' }, '', location.href); } catch (_) {}
  lastScreen = screenKey();
  const app = root();
  if (app && typeof MutationObserver !== 'undefined') {
    new MutationObserver(observeScreen).observe(app, { childList: true, subtree: true, characterData: true });
  }
  addEventListener('popstate', () => {
    const key = screenKey();
    if (!key || key === 'home' || key === 'onboarding') return;
    const control = backControl();
    if (!control) {
      if (typeof window.home === 'function') window.home();
      return;
    }
    handlingBack = true;
    control.click();
    // Re-arm the newly rendered view so the next Back gesture can continue
    // navigating, while Home itself remains free to exit the app.
    setTimeout(() => {
      const next = screenKey();
      lastScreen = '';
      handlingBack = false;
      pushScreen(next);
    }, 0);
  });
})();
