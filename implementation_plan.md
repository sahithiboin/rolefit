# Implementation Plan - RoleFit Enhancements

This plan outlines the steps to modernize RoleFit with cloud-based profiles, a premium landing page, dark mode, and a new teal-inspired color scheme.

## User Review Required

> [!IMPORTANT]
> **Firebase Setup**: You will need to create a project on the [Firebase Console](https://console.firebase.google.com/) and provide me with the configuration keys (API Key, Project ID, etc.). I will provide a template for where to put these.
> 
> **Cloud Storage**: Switching to Firebase means profiles will be stored in the cloud. I will implement logic to "sync" local profiles to the cloud once a user signs in.

## Proposed Changes

### Core Design System & Theme
Update the global styles to support the new color palette and dark mode switching.

#### [MODIFY] [index.css](file:///Users/mcwahahan/Downloads/RoleFit/rolefit/src/index.css)
- Extract colors from the provided image and define them as CSS variables (`--primary`, `--primary-light`, etc.).
- Add a `.dark` class selector to override variables for dark mode.
- Add smooth transition properties to `body` and `card` elements.

#### [NEW] [ThemeToggle.jsx](file:///Users/mcwahahan/Downloads/RoleFit/rolefit/src/components/ThemeToggle.jsx)
- A sleek, animated button to switch between light and dark modes.

---

### Authentication Layer (Firebase)
Integrate Firebase to enable Google Sign-In and profile persistence.

#### [NEW] [firebase.js](file:///Users/mcwahahan/Downloads/RoleFit/rolefit/src/lib/firebase.js)
- Firebase initialization and exports for `auth` and `db` (Firestore).

#### [NEW] [AuthContext.jsx](file:///Users/mcwahahan/Downloads/RoleFit/rolefit/src/components/AuthContext.jsx)
- A React Context provider to track `currentUser` and handle `login`/`logout` logic globally.

---

### Landing Page Upgrade
Transform the entrance of the app to feel high-end.

#### [MODIFY] [Home.jsx](file:///Users/mcwahahan/Downloads/RoleFit/rolefit/src/pages/Home.jsx)
- Replace static content with a "Hero" section.
- Integrate the new `Carousel` component.
- Add "Sign in with Google" as the primary CTA.

#### [NEW] [Carousel.jsx](file:///Users/mcwahahan/Downloads/RoleFit/rolefit/src/components/Carousel.jsx)
- An animated, auto-scrolling horizontal list of feature cards using `framer-motion`.

---

### Data Persistence Update
Move away from `localStorage` to Cloud Firestore.

#### [MODIFY] [Builder.jsx](file:///Users/mcwahahan/Downloads/RoleFit/rolefit/src/pages/Builder.jsx)
- Update saving logic to check if a user is logged in.
- If logged in, save/load from Firestore; if not, fallback to local storage with a "Cloud Sync" prompt.

## Verification Plan

### Automated Tests
- I will run `npm run dev` to ensure no build errors after adding new dependencies.

### Manual Verification
1. **Theming**: Toggle dark mode and verify every component (Buttons, Cards, Inputs) adapts correctly.
2. **Carousel**: Ensure the carousel scrolls smoothly and cards animate correctly on hover.
3. **Authentication**: 
    - Click "Sign in with Google".
    - Verify profile details are saved to the cloud after generation.
    - Log out, log back in, and ensure the profile is restored.
