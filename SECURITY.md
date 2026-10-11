# Security checklist

## Browser configuration versus secrets

This app is a static browser application. Its Firebase web configuration and Google OAuth client ID are delivered to every visitor's browser; moving these values into GitHub Actions secrets would not make them secret. Do not put any of the following in this repository or frontend bundle:

- OAuth client secrets
- Firebase Admin SDK service-account JSON/private keys
- Private signing keys, access tokens, or passwords

The CI secret scan checks tracked text files for common private-key/token formats. It is a guardrail, not a guarantee; review any incident and scan git history if a secret was ever committed.

## Required Firebase / Google Cloud console hardening

These steps require project-owner access in Firebase / Google Cloud and cannot be enforced by changing this repository alone:

1. **Restrict the browser API key.** In Google Cloud Console → APIs & Services → Credentials, identify the API key used by this Firebase web app. Set website/referrer restrictions to the exact production origin(s), including `https://srma4tech.github.io/*` if supported by the console. Restrict API access to only the APIs this app actually needs; verify Firebase Auth and Firestore still work after applying restrictions.
2. **OAuth authorized domains.** In Firebase Console → Authentication → Settings → Authorized domains, retain only domains needed for the app and its development workflow. Include `srma4tech.github.io` for the current GitHub Pages host.
3. **OAuth client.** In Google Cloud Console → APIs & Services → Credentials, configure the relevant web OAuth client with only required JavaScript origins and redirect URIs. A client ID is public; the client secret is not for browser apps.
4. **Firestore rules.** Publish `firestore.rules` from this repository in Firebase Console or Firebase CLI. Verify the deployed rules are at least as restrictive as the repository rules. The current rules limit each signed-in user to their own `users/{uid}` document and subpaths are not implicitly granted.
5. **Test access controls.** Confirm signed-out reads/writes fail, user A cannot read/write user B's profile, and normal authenticated progress saving still works.
6. **If a private credential was ever committed**, treat it as compromised: revoke/rotate it in its issuing console, remove it from current files, and assess git history. Deleting a value from the latest commit alone does not revoke it.

## Secret scanning

GitHub Actions runs `.github/scripts/secret-scan.py` on each push and pull request. It looks for common private-key blocks, service-account key material, Google OAuth client secrets, GitHub tokens, and AWS access key IDs. Firebase browser configuration is intentionally excluded because it is public client configuration and must be secured with restrictions and Firebase rules.
