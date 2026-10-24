# Little Learners

A child-friendly, installable learning PWA for young children. Activities cover English alphabets, Hindi Varnamala, numbers, fruits, vegetables, animals, birds, body parts and good manners. The interface supports English, Hindi and bilingual learning.

- **Live app:** https://srma4tech.github.io/little-learners/
- **Repository:** https://github.com/srma4tech/little-learners
- **Deployment branch:** `master` (GitHub Pages serves the repository root)

## Use the app

1. Open the live app in a supported browser.
2. Follow the welcome flow and choose the child's name and language.
3. Use the parent corner to switch children, language and voice settings, or reset progress.
4. Sign in with Google from the parent corner to sync through Firebase. If this device already has a configured guest profile or earned stars, the app asks whether to merge that data into the Google account or keep it separate. Choosing separate keeps the guest snapshot on this device and loads the account profile without uploading guest data. Signing out returns to the saved guest profile; it does not delete cloud data.
5. To install, use the app's Install prompt when available, or the browser menu's **Install app** / **Add to Home Screen** option.

## Firebase setup

The app uses Firebase Authentication, Google Identity Services (GIS), and Cloud Firestore.

1. In Firebase Console, create or select the project and register a **Web app**.
2. Copy the Firebase web-app configuration into `firebase-config.js`. Set `googleClientId` to the OAuth 2.0 **Web application client ID** used by Google Identity Services. These are browser-side configuration values, not Firebase Admin credentials; never commit service-account keys or OAuth client secrets.
3. In **Authentication → Sign-in method**, enable **Google**.
4. In **Authentication → Settings → Authorized domains**, add `srma4tech.github.io`.
5. In Google Cloud Console, verify the OAuth web client has the GitHub Pages origin `https://srma4tech.github.io` authorized where required by its configuration.
6. Create a Cloud Firestore database and publish the rules from `firestore.rules`.
7. Open the live app, sign in with Google, and verify that the child profile and progress persist after refresh.

The Firestore rules allow an authenticated user to read and write only their own `users/{uid}` document. Review any future data-model changes against these rules before deployment.

If Firebase is not configured, the app can still be used in guest mode, with progress saved locally on that device. Guest progress is not automatically shared across devices.

## GitHub Pages deployment

The site is published from the repository root on `master`. A push to `master` triggers the Pages deployment workflow.

## Continuous integration and browser smoke test

The **Little Learners CI** workflow runs source checks on pushes and pull requests targeting `master`. It checks inline JavaScript syntax, the Playwright smoke-test script syntax, reset-aware progress-model tests, tracked files for private credentials, and required app files and key authentication markers.

A separate Playwright browser smoke test runs on pull requests, scheduled runs, manual dispatch, and pushes to `master`. Pull requests are tested against a local server serving the proposed checkout; scheduled, manual, and `master` push runs validate the deployed GitHub Pages release version and service-worker cache. The test exercises onboarding/guest entry, learning cards, quizzes and rewards, reload persistence, stickers, and parent settings at 320, 360, 390, 768, 1024, and 1440 CSS pixels. It checks horizontal overflow and visible control labels/tap-target heights, and captures screenshots plus browser diagnostics as workflow artifacts. The expected version and cache markers are read from `index.html` and `sw.js` at runtime so the smoke test does not drift behind routine releases.

To inspect a run, open the repository's **Actions** tab and select the relevant workflow run. The smoke test is a deployment sanity check; it does not sign into a real Google account or replace manual checks of sign-in and cross-device persistence.

## Updating the app and service-worker cache

The service worker uses a versioned cache in `sw.js` (currently `little-learners-v45`). When changing app files that should refresh for existing installations, increment the service-worker cache suffix (currently `little-learners-v45`). Do not bump it for documentation-only changes. The live smoke test derives the expected cache name and footer version from the checked-out `sw.js` and `index.html`, so those markers do not need to be copied into the test script. Commit the change to `master`, wait for GitHub Pages deployment, then test both a fresh browser session and an already-installed PWA. The reset-aware progress model lives in `progress-model.js` and is covered by `node --test tests/progress-model.test.cjs`.

## Data and privacy notes

- Do not put private credentials, Firebase Admin SDK keys, or OAuth client secrets in this public repository.
- Firestore rules are the server-side access control; hiding controls in the UI is not a security boundary.
- Test changes to sign-in, profile merging and progress persistence carefully because these affect a child's saved learning history.
