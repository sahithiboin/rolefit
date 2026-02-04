# RoleFit - AI-Powered Resume Tailor

![Gemini 3 Hackathon](https://img.shields.io/badge/Built%20for-Gemini%203%20Hackathon-blue)

RoleFit is an intelligent career assistant that helps job seekers tailor their resumes and cover letters to specific job descriptions using the power of Google's **Gemini 3** models.

## 🚀 Features

-   **Smart Resume Parsing**: Extracts skills, experience, and education from PDF resumes.
-   **Job Description Analysis**: Understands key requirements and nuances of job postings.
-   **AI Match Analysis**: Provides a detailed fit score and identifies gaps between the profile and the job.
-   **Custom Content Generation**: Generates tailored resumes and cover letters in PDF and DOCX formats.
-   **Interactive Refinement**: Allows users to tweak the tone and content using natural language prompts.

## 🛠️ Tech Stack

-   **Frontend**: React, Vite, TailwindCSS
-   **Backend**: Python, FastAPI
-   **AI Engine**: Google Gemini 3 (via Google GenAI SDK)
-   **Docs**: PDF generation (jspdf), DOCX generation (docx)

## 🏗️ Setup & Installation

### Prerequisites
-   Node.js & npm
-   Python 3.9+
-   Google AI Studio API Key

### Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd rolefit/backend
    ```
2.  Create a virtual environment:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Create a `.env` file in `rolefit/backend/` and add your API key:
    ```env
    GOOGLE_API_KEY=your_gemini_api_key_here
    ```
5.  Run the server:
    ```bash
    uvicorn main:app --reload
    ```
    The API will be available at `http://localhost:8000`.

### Frontend Setup

1.  Navigate to the project root:
    ```bash
    cd rolefit
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    The app will run at `http://localhost:5173`.

## 🤖 Gemini 3 Integration

This project leverages **Gemini 2.0 Flash** (referred to as Gemini 3 in the context of the hackathon) for its multi-modal and reasoning capabilities. The integration logic is located in `backend/logic/`.

-   `backend/logic/parser.py`: Uses Gemini to structure unstructured PDF data.
-   `backend/logic/matcher.py`: Performs semantic matching between resume and job description.
-   `backend/logic/generator.py`: Generates highly contextualized application documents.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
