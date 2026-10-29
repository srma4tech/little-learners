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
    if (app.querySelector('.learning-path-options')) return 'learning-activity:' + (app.querySelector('h2')?.textContent.trim() || '');
    if (app.querySelector('.learning-path-list')) return 'learning-path';
    if (app.querySelector('.reading-shell')) {
      // Library and story detail share a toolbar heading, so identify them
      // from their actual content regions rather than the common toolbar.
      if (app.querySelector('.reading-story')) {
        const title = app.querySelector('.reading-story')?.closest('.reading-panel')?.querySelector('h2');
        return 'reading-story:' + (title?.textContent.trim() || 'detail');
      }
      if (app.querySelector('.reading-library')) return 'reading-library';
      return 'reading-loading';
    }
    if (app.querySelector('.category-bar')) return 'category:' + (app.querySelector('.category-title')?.textContent.trim() || '');
    if (/Round\s+\d+\//.test(app.textContent)) return 'quiz:' + (app.querySelector('.bar h2')?.textContent.trim() || '');
    if (app.querySelector('.parent-settings')) return 'parents';
    if (app.querySelector('.profile-list')) return 'profiles';
    if (app.querySelector('.st')) return 'stickers';
    // Most legacy learning screens replace #app rather than changing routes.
    // A stable heading fallback keeps those screens in the same Back stack.
    const heading = app.querySelector('h1, h2, [role="heading"]');
    if (heading) return 'screen:' + heading.textContent.trim().replace(/\s+/g, ' ').slice(0, 100);
    const firstButton = app.querySelector('button');
    return firstButton ? 'screen:' + (firstButton.getAttribute('aria-label') || firstButton.textContent.trim().slice(0, 60)) : '';
  }

  function pushScreen(key) {
    if (!key || key === lastScreen) return;
    lastScreen = key;
    if (handlingBack) return;
    try {
      history.pushState({ littleLearnersScreen: key }, '', location.href);
    } catch (_) {}
  }

  function backControl() {
    const app = root();
    if (!app) return null;

    // Reading story detail has a meaningful in-section Back target. Prefer
    // returning to the library over the generic toolbar's Home button.
    if (app.querySelector('.reading-story')) {
      const storyLibrary = [...app.querySelectorAll('.reading-actions button:not(:disabled)')]
        .find(button => /all stories|सभी कहानियाँ/i.test(button.textContent || ''));
      if (storyLibrary) return storyLibrary;
    }

    const buttons = [...app.querySelectorAll('button:not(:disabled)')];
    // Accessible labels are the most reliable signal across feature areas.
    const explicit = buttons.find(button => {
      const label = (button.getAttribute('aria-label') || button.getAttribute('title') || '').trim();
      return /^(home|go to home|back|go back|back to activities|story library|close|close activity)$/i.test(label);
    });
    if (explicit) return explicit;

    // Many existing screens use an outlined first toolbar button for Back.
    const toolbar = app.querySelector('.bar button.btn.o:not(:disabled)');
    if (toolbar) {
      const label = (toolbar.getAttribute('aria-label') || toolbar.getAttribute('title') || toolbar.textContent || '').trim();
      if (!/^(next|continue|start|submit|check|finish|done)$/i.test(label)) return toolbar;
    }

    return buttons.find(button => {
      const label = (button.getAttribute('aria-label') || button.getAttribute('title') || button.textContent || '').trim();
      return /^(⬅\s*)?(home|back|go back|back to activities|story library|close)$/i.test(label);
    }) || null;
  }

  function observeScreen() {
    const key = screenKey();
    if (!key || key === lastScreen) return;
    pushScreen(key);
  }

  // Each meaningful in-app view gets a same-URL history entry. This covers
  // Android hardware Back, Android edge-swipe Back, and browser Back.
  try {
    history.replaceState({ littleLearnersScreen: screenKey() || 'home' }, '', location.href);
  } catch (_) {}
  lastScreen = screenKey();

  const app = root();
  if (app && typeof MutationObserver !== 'undefined') {
    new MutationObserver(observeScreen).observe(app, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  addEventListener('popstate', () => {
    const current = screenKey();
    // Home is the natural exit boundary; do not trap Back there.
    if (!current || current === 'home' || current === 'onboarding') return;

    const control = backControl();
    handlingBack = true;
    if (control) {
      control.click();
    } else if (typeof window.home === 'function') {
      // Never strand a child on a screen without a discoverable Back control.
      window.home();
    }

    setTimeout(() => {
      // popstate has already moved the browser's history pointer. Pushing a
      // replacement entry here would erase Forward navigation and trap Back
      // on the same screen. Record the rendered destination without pushing.
      lastScreen = screenKey();
      handlingBack = false;
    }, 0);
  });
})();
