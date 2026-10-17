# Little Learners

A child-friendly, installable learning PWA for children aged 4–5. It covers English alphabets, Hindi Varnamala, numbers, fruits, vegetables, animals, birds, body parts and good manners. The interface supports English, Hindi and bilingual learning.

- **Live app:** https://srma4tech.github.io/little-learners/
- **Repository:** https://github.com/srma4tech/little-learners
- **Deployment branch:** `master` (GitHub Pages serves the repository root)
- **Current build:** `2026.10.17.5`
- **Service-worker cache:** `little-learners-v47`

## Use the app

1. Open the live app in Chrome or another supported browser.
2. Follow the welcome flow and configure the child's nickname, language and voice.
3. Use the parent corner to switch children, change preferences, reset progress, or manage the account. The parent gate is a child-safety speed bump, not a substitute for adult supervision.
4. Use guest mode to keep progress on this device. Parent Google sign-in is optional and enables cloud sync.
5. If the device has guest progress, sign-in asks whether to **Add** this device's kids to the account or **Keep account only**. Guest progress is backed up locally and is not silently discarded.
6. To install, use the app's Install prompt when available, or Chrome's menu → **Install app** / **Add to Home screen**.

## Firebase configuration and status

Firebase is configured for project `little-learners-fc471`. The app uses Firebase Authentication, Google Identity Services (GIS), and Cloud Firestore. The browser-side configuration in `firebase-config.js` includes the Firebase web config and the Google OAuth web client ID (`googleClientId`). These values are public client configuration; never add service-account keys or OAuth client secrets.

To reproduce or change the configuration:

1. Firebase Console → Project settings → Your apps → Web app: verify the Firebase web config.
2. Firebase Console → Authentication → Sign-in method: enable **Google**.
3. Firebase Console → Authentication → Settings → Authorized domains: include `srma4tech.github.io`.
4. Google Cloud Console → APIs & Services → Credentials: verify the OAuth web client allows the origin `https://srma4tech.github.io`.
5. Firebase Console → Firestore Database → Rules: paste the complete contents of `firestore.rules`, then click **Publish**. Review the rules against any future schema change.
6. Confirm the Firestore database exists and open the live app to test a new account, returning account, guest flow, and progress sync.

### Publishing Firestore rules

1. Open https://console.firebase.google.com/ and select `little-learners-fc471`.
2. Open **Build → Firestore Database → Rules**.
3. Replace the editor contents with the entire `firestore.rules` file from this repository.
4. Click **Publish** and wait for the success confirmation.
5. Test both an authenticated owner's document and an attempted cross-user access in the Rules Playground or Emulator before considering a schema change complete.

The rules restrict reads and writes to the signed-in owner of `users/{uid}`, validate allowed top-level fields, limit each account to ten kids, and validate child names and star counts. Do not rely on UI checks as a security boundary.

## Privacy and deletion

Read [the privacy policy](./privacy.html). Guest progress is stored locally. Signed-in progress is stored in the account's Firestore profile. Parent settings include **Delete my data and account**; Firebase may require a fresh sign-in before it will delete the Authentication user. If that happens, sign in again and retry. Clearing browser storage and deleting cloud data are separate operations.

No ads or third-party analytics/tracking are included.

### Experimental AI helpers

AI helpers are disabled until a parent enables them in the gated Parent settings. A parent may paste their own Gemini API key; it is stored only in this browser's local storage and is not included in Firestore sync or repository files. Requests go directly from the browser to Google's Gemini API, so Google receives the prompt and the supplied key is exposed to the browser environment. API usage may incur charges or quota limits. Generated stories and quiz questions can be inaccurate or unsuitable despite prompt and output filtering; a parent must review every result before showing it to a child. Remove the key from Parent settings when it is no longer needed. This browser-only integration has no server-side secret protection.

## GitHub Pages deployment

The site is served from the repository root on branch `master`; there is no build step. Keep `index.html`, `sw.js`, `manifest.webmanifest`, `firebase-config.js`, `progress-model.js`, `privacy.html`, `audio/manifest.json`, and the icon files at the root or update all relative paths and cache entries.

1. Commit the static files to `master` (or merge a reviewed pull request into `master`).
2. Wait for the GitHub Pages deployment to finish under **Actions**.
3. Open the live site and verify the latest build label.
4. Test both a fresh browser session and an existing installed PWA. A waiting service-worker update offers **New version available — Reload** rather than forcing a surprise reload during learning.

Keep app files at the repository root unless the service-worker cache list and all relative paths are updated deliberately.

## Tests and CI

The **Little Learners CI** workflow runs inline JavaScript syntax checks, progress-model tests, a private-credential scan, required-file/auth-flow checks, and Playwright user-flow tests on pushes and pull requests targeting `master`. The browser tests stub Firebase/GIS and cover onboarding, account migration, quizzes/rewards, the parent gate, child management, offline status, install prompt behavior, XSS escaping and local-only AI-key handling. The separate Playwright live smoke test checks the deployed page and responsive overflow; it does not perform real Google OAuth.

Run the existing progress-model unit tests locally:

```sh
node --test tests/progress-model.test.cjs
```

To run the static app locally without a build step:

```sh
python -m http.server 8000
```

Then open http://localhost:8000/. For browser automation, install Playwright and Chromium in your development environment and run the repository's test workflow/scripts. A real Google login and cross-device sync still require manual verification with a test account.

## Updating the app and service-worker cache

Whenever a release changes runtime files or behavior, increment the versioned cache name in `sw.js` (currently `little-learners-v45`) and update the build label in `index.html`. Ensure the cache list includes every required root-level runtime file, including the manifest, Firebase config, progress model, icons and privacy page. The worker intentionally does not intercept cross-origin Firebase or Google requests. After deployment, test online launch, offline reload, and the waiting-worker update prompt.

## Known limitations

- Offline changes are saved locally and sync when connectivity returns; concurrent devices still rely on the current single-profile Firestore merge model.
- Google sign-in cannot be fully exercised by CI; test the configured OAuth flow manually.
- Browser speech quality and Hindi voice availability depend on the operating system and installed voices.
- The parent gate is a simple arithmetic check intended to discourage accidental child access, not provide strong authentication.
