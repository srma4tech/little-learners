# Release checklist

## Before publishing rules
1. Back up the currently published Firestore rules into a dated local file.
2. Record the current `master` commit SHA (and create a release tag if your normal release process uses tags).
3. Run the Firestore Emulator rules tests: `npm ci && npm run test:rules`.
4. In Firebase Console → Firestore → Rules Playground, test the exact cases documented in `tests/rules/firestore.rules.test.cjs`: owner legacy profile read/create/update; owner child document create/update; unauthenticated and other-UID reads/writes; invalid profile/kid shapes; 11th child; invalid child IDs; and owner deletes.
5. Publish the reviewed rules. They deliberately permit the legacy top-level `email`/`displayName` fields for the old live build while the new client removes them on its next profile write.
6. Smoke-test the CURRENT live Pages site (old build) immediately after publishing: Google sign-in, load existing progress, update stars, reload, sign out/in.

## Optional local new-build test
1. `git checkout fix/part1-hardening`
2. `python -m http.server 8080`
3. In Google Cloud Console, add `http://localhost:8080` to the OAuth client’s Authorized JavaScript origins (remove it after testing if no longer needed).
4. Open `http://localhost:8080` and sign in with a throwaway/test Google account. Never paste production credentials into screenshots or logs.

## Release
1. Ensure PR checks are green and review the remaining manual-test checklist.
2. Squash and merge PR #49 into `master`.
3. Verify GitHub Pages deployment succeeded.
4. In Parent corner, confirm the Build label. Inspect DevTools → Application → Service Workers/Cache Storage and confirm the expected cache version from `sw.js`.
5. Test sign-in, old-profile migration, per-kid progress, offline recovery, and account deletion.

## Rollback
1. Revert the merge commit in GitHub (do not force-push).
2. Restore the backed-up Firestore rules in Firebase Console and publish them.
3. Smoke-test the old live build again. If rules have already been migrated, verify old-format access before restoring.

## Known external/manual checks
Real Google OAuth, production rules, Android/iOS installation, and Lighthouse scores must be verified by a human with the live deployment. Do not claim them as passed based on stubbed CI.
