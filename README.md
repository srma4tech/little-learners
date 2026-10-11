# Little Learners
Kids' learning PWA: Alphabets, Varnamala, Numbers, Fruits, Vegetables, Animals, Birds, Body Parts, Manners (English + Hindi).

## Publish on GitHub Pages
1. Create a repo named `little-learners` and upload the contents of this folder to the repo root.
2. Settings > Pages > Deploy from branch > `main` / root.
3. Open `https://<your-username>.github.io/little-learners/` and use Install / Add to Home Screen.

## Firebase (later)
1. Create a Firebase project, add a Web app, copy its config into `firebase-config.js`.
2. Authentication > Sign-in method > enable Google. Add `<your-username>.github.io` under Authorized domains.
3. Create a Firestore database and paste `firestore.rules` into Rules.
Progress is stored in `users/{uid}` (kids and stars). Without config the app runs in guest mode.

When you change files, bump `CACHE` version in `sw.js` (`little-learners-v1` > `v2`) so devices refresh.
