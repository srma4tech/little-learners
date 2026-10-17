# Real-device manual test checklist

Use a test/throwaway Google account for destructive account-deletion testing.

- [ ] Fresh Google account shows child setup before creating its profile.
- [ ] Existing account signs in and keeps existing child profiles and stars.
- [ ] Guest with meaningful progress → sign-in presents Add / Keep account only; verify both choices.
- [ ] Start learning online, go offline, complete a quiz, return online and verify sync.
- [ ] Add stars on two devices and confirm progress converges without lost increments.
- [ ] Parent gate blocks settings until answered; leaving settings and 60 seconds idle relock it.
- [ ] Delete test account; verify confirmation, re-authentication fallback, Firestore profile/child docs removal and local-data clearing.
- [ ] Install PWA on Android Chrome; launch installed app and check offline fallback/update toast.
- [ ] On iOS Safari, use Share → Add to Home Screen; verify launch and layout.
- [ ] Hindi speech: verify a Hindi voice is available; if not, confirm the UI explains the browser/device needs a Hindi voice.
- [ ] Check browser console on onboarding, home, each section, quiz, games, parent dashboard, privacy page and account deletion; no unexpected errors.
- [ ] Confirm current Build label and service-worker cache version match the release.
