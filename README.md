# RoleFit: AI-Powered Career Strategist 🚀

![Gemini 3 Hackathon](https://img.shields.io/badge/Status-Hackathon%20Ready-success)
![Built with Gemini](https://img.shields.io/badge/AI-Gemini%203%20Flash-blue)
![Frontend](https://img.shields.io/badge/Frontend-React%20%2F%20Vite-61dafb)
![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2F%20Python-009688)

## 🌐 Live Demo
**[Launch RoleFit &rarr;](https://rolefit-backend-946716696276.us-central1.run.app/)**

RoleFit is a next-generation career assistant designed (and optimized) to bridge the gap between candidate potential and job requirements. By leveraging the advanced reasoning of **Google Gemini 3 Flash**, RoleFit analyzes resumes and job descriptions to generate highly tailored, ATS-optimized application packages.

> **Most AI resume tools hallucinate achievements. RoleFit refuses to.**

---

## ⚡ Quick Start

Get RoleFit running in under 2 minutes:

```bash
# 1. Backend Setup
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# Configure backend/.env (see Configuration below)
uvicorn main:app --reload

# 2. Frontend Setup (In a new terminal)
cd ..
npm install
# Configure root .env (see Configuration below)
npm run dev
```

---

## 🧠 How RoleFit Works

1. **Upload & Paste**: Provide your current resume and the target job description.
2. **Deep Alignment**: RoleFit analyzes semantic alignment and identifies gaps using Gemini 3 Flash.
3. **Professional Output**: Receive a custom resume, cover letter, and fit analysis instantly.

---

## ✨ Key Features

-   **🔍 Contextual Analysis**: Deep-parsing of resumes and JDs to understand intent, not just keywords.
-   **📊 Fit Analysis**: Instant "AI Verdict" and delta-score showing exactly where you stand.
-   **✍️ Dynamic Generation**: AI-crafted resumes and cover letters tailored for every specific role.
-   **🛠️ Interactive Refinement**: Tweak tone, emphasis, and content using natural language commands.
-   **📄 Multi-Format Export**: One-click download in professional PDF and DOCX formats.

---

## 🆚 Why RoleFit is Different

-   ✅ **Zero Hallucination**: No made-up skills or fake achievements; truth is our foundation.
-   ✅ **Transparent Fit Scoring**: Real gap analysis that tells you exactly why you fit (or why you don't).
-   ✅ **ATS-Optimized**: High-quality structural output, not generic "AI-sounding" text.
-   ✅ **Human-in-the-Loop**: Interactive refinement keeps you in the driver's seat.

---

## ⚙️ Configuration & Environment

RoleFit requires two environment files to function correctly. **Do not commit these files to version control.**

### 1. Backend Configuration (`backend/.env`)
Create a `.env` file in the `backend/` directory:

```env
GOOGLE_API_KEY=your_google_ai_studio_key_here
```
> [!NOTE]  
> Obtain your key from the [Google AI Studio](https://aistudio.google.com/).

### 2. Frontend Configuration (`.env`)
Create a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```
> [!IMPORTANT]  
> These values can be found in your Firebase Project Settings under "General" -> "Your apps".

### 3. Job Scout Multi-User Setup (`.env.local`)

Job Scout reads the active user and target Sheet at runtime, so each operator can run the same repo without editing code. Create a project-root `.env.local` file on the machine that will run the scout:

```env
# Sahithi default:
ACTIVE_USER_ID=UKiZh8nZRSbZ8RIhgu6rWc3D7Fm2
GOOGLE_SHEET_ID=1NnSvMimPpmrqrr6AZ1Aw1ikBLXRot7cMxUh1DYrMhMk
GOOGLE_SHEET_TAB_NAME=Sahithi

# Sushmita Allumolu:
# ACTIVE_USER_ID=YKJYN0RCB8Uww9c3n3ZNwEa8xc63
# GOOGLE_SHEET_ID=1NnSvMimPpmrqrr6AZ1Aw1ikBLXRot7cMxUh1DYrMhMk
# GOOGLE_SHEET_TAB_NAME=Sushmita

# Optional: override LinkedIn storage state.
# LINKEDIN_STATE_PATH=.auth/linkedinState_YKJYN0RCB8Uww9c3n3ZNwEa8xc63.json
```

For Sushmita, use:

```env
ACTIVE_USER_ID=YKJYN0RCB8Uww9c3n3ZNwEa8xc63
GOOGLE_SHEET_ID=1NnSvMimPpmrqrr6AZ1Aw1ikBLXRot7cMxUh1DYrMhMk
GOOGLE_SHEET_TAB_NAME=Sushmita
```

Keep her RoleFit Builder profile up to date in the web app. Each `npm run job-scout` run fetches the latest Firestore profile from `users/<ACTIVE_USER_ID>` or `profiles/<ACTIVE_USER_ID>` before evaluating jobs, then falls back to `profiles/<ACTIVE_USER_ID>.json` only if Firestore is unavailable. Sheet rows go to the tab named by `GOOGLE_SHEET_TAB_NAME`; if it is missing, `npm run sync-sheets` creates it and writes the standard eight headers.

Save the user-specific LinkedIn browser session once per machine:

```bash
npm run save-linkedin-session
```

This writes `.auth/linkedinState_<ACTIVE_USER_ID>.json`, falling back to `.auth/linkedinState.json` if a user-specific file is not present. Then run the scout:

```bash
npm run job-scout
```

To refresh a local checkout before running:

```bash
npm run update
```

---

## 🐳 Docker Deployment

For production-like environments, RoleFit can be containerized using the included Dockerfile.

```bash
# Build the combined frontend/backend image
docker build -t rolefit .

# Run the container (ensure env vars are passed or included in the build)
docker run -p 8000:8000 rolefit
```

---

## 🛠️ Architecture & Tech Stack

-   **AI Foundation**: Uses Gemini 3 Flash for multi-modal parsing and document synthesis.
-   **Backend**: High-performance API built with **FastAPI** and **Python 3.13**.
-   **Frontend**: Modern, responsive UI built with **React**, **Vite**, and **TailwindCSS**.
-   **Deployment**: Production-ready with **Docker** and automated deployment scripts.

---

## 🧩 Troubleshooting

### Frontend shows a blank screen
-   Check that the `.env` file exists in the **project root**.
-   Ensure all `VITE_FIREBASE_*` variables are set correctly.
-   Open the browser console (F12) to check for initialization errors.

### Backend fails to start
-   Confirm Python version is 3.9 or higher.
-   Verify that `backend/.env` contains `GOOGLE_API_KEY` (and matches the exact name).
-   Try re-installing dependencies: `pip install -r requirements.txt`.

### API Errors
-   Ensure the backend server is running on `http://localhost:8000`.
-   Verify your Google API key has sufficient quota and is enabled for the Gemini API.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---
Built with ❤️ by the RoleFit Team.
