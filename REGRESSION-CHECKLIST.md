# Little Learners — Release Regression Checklist

Use this checklist after changes to authentication, child profiles, progress storage, the service worker, or the learning UI. The automated browser smoke test is useful but does not replace these real-account checks.

## Automated checks

- [ ] [Little Learners CI](https://github.com/srma4tech/little-learners/actions/workflows/little-learners-ci.yml) passes on `master`.
- [ ] The live browser smoke test passes; review its screenshot and `browser-errors.json` artifact.
- [ ] [GitHub Pages deployment](https://github.com/srma4tech/little-learners/actions/workflows/pages-build-deployment) completes successfully.

## Functional checks — regular browser

- [ ] Open the [live app](https://srma4tech.github.io/little-learners/) in a fresh Chrome tab; welcome/onboarding or learning home renders.
- [ ] Complete onboarding in English, Hindi, and bilingual mode; verify the chosen language and voice setting remain selected after refresh.
- [ ] Open each learning category, answer a question correctly and incorrectly, and verify feedback, next-question flow, and stars.
- [ ] Open the parent corner; confirm the parent gate works and child switching, adding, renaming, and reset controls behave as intended.
- [ ] Guest mode works without signing in, and its progress persists after a refresh on the same device.
- [ ] With configured guest progress or earned stars, sign-in explicitly asks whether to merge or keep guest data separate.
- [ ] Choose “keep separate”; verify guest progress is preserved locally and is not uploaded to the account.
- [ ] Sign out / switch to guest; verify the saved guest profile returns and cloud account data remains untouched.
- [ ] Switch from Google account A to account B; verify A’s cached child profiles/progress are not shown or merged into B.
- [ ] Deny or interrupt the cloud profile read; verify the app reports the failure and does not silently upload guest data.
- [ ] Sign out / switch to guest; confirm the app returns to the separately saved guest profile and does not clear cloud data.
- [ ] Reset the selected child's progress; verify stars and sticker totals become zero while the child's profile and other children remain unchanged.
- [ ] Reset while offline, reconnect, and verify the reset is eventually reflected in the cloud profile.
- [ ] Reconnect a second device with pre-reset rewards; verify its stale snapshot cannot restore those rewards.
- [ ] Earn new stars after a reset and verify they persist after refresh and cloud sync.
- [ ] If cloud sync fails during reset, verify the UI says the reset is local/pending rather than claiming cloud completion.

## Functional checks — Google sign-in and cloud persistence

- [ ] Sign in using the Google button in the parent corner; a successful sign-in returns to the app without a stuck loading state.
- [ ] Confirm the signed-in profile is visible and the expected `users/{uid}` document exists in Firestore.
- [ ] Change the child profile and earn stars; refresh and verify the same child and progress are restored.
- [ ] Open the app on a second browser/device, sign in with the same Google account, and verify the cloud-backed profile/progress is available.
- [ ] Sign back in and confirm the correct cloud profile is restored without duplicate or lost child profiles.

## PWA and offline checks

- [ ] Install the app where supported and launch it from the home screen.
- [ ] After a new service-worker cache version deploys, reopen an already-installed PWA and verify it updates to the latest UI.
- [ ] With the app loaded, temporarily go offline and verify the cached shell opens; restore connectivity and verify cloud features recover.
- [ ] Check a narrow mobile viewport for horizontal overflow and verify the primary controls remain usable.

## Release record

- **Branch:** `master` (keep the single-branch workflow).
- **Stable baseline tag:** `v1.0.0-stable`.
- **Release page:** https://github.com/srma4tech/little-learners/releases/tag/v1.0.0-stable
- **Record the CI run URL, date, browser/device, and any failed step before calling a release verified.**

Do not mark a manual check as passed unless it was actually performed. Avoid changing authentication or progress-merging logic just to make a checklist pass; capture the observed failure and investigate the root cause.
