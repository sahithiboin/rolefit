from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from models import JobDescriptionInput, MatchRequest, GenerateRequest, RefineRequest, ResumeInput, IngestJobRequest
from logic.parser import parse_job_description, parse_resume
from logic.matcher import match_profile_to_job
from logic.generator import generate_full_package, refine_package, generate_all_in_one
from fastapi.staticfiles import StaticFiles
from services.job_ingestion import ingest_job, JobGenerationError, JobStorageError
import logging
import os

logger = logging.getLogger(__name__)
app = FastAPI()

# ... existing CORS middleware ...
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
@app.post("/api/jobs/ingest")
def ingest_job_endpoint(request: IngestJobRequest):
    # Sync route: FastAPI runs the blocking Gemini/Firestore calls in its thread pool.
    try:
        return ingest_job(request)
    except JobGenerationError as exc:
        logger.exception("Job ingestion generation failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except JobStorageError as exc:
        logger.exception("Job ingestion persistence failed")
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected job ingestion failure")
        raise HTTPException(status_code=500, detail="Job ingestion failed.") from exc


@app.get("/api/health")
def health_check():
    return {"status": "RoleFit Backend Running"}

@app.post("/api/parse-job")
def parse_job(job: JobDescriptionInput):
    try:
        print(f"DEBUG: Parsing job text length: {len(job.text)}")
        result = parse_job_description(job.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/parse-resume")
def parse_resume_endpoint(resume: ResumeInput):
    try:
        print(f"DEBUG: Parsing resume text length: {len(resume.resume_text)}")
        result = parse_resume(resume.resume_text)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/parse-resume-upload")
async def parse_resume_upload(file: UploadFile = File(...)):
    try:
        from pypdf import PdfReader
        import io
        
        contents = await file.read()
        f = io.BytesIO(contents)
        reader = PdfReader(f)
        
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
            
        print(f"DEBUG: Parsed PDF from upload. Text length: {len(text)}")
        result = parse_resume(text)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/match")
def match(request: MatchRequest):
    try:
        job_data = parse_job_description(request.job_description_text)
        match_result = match_profile_to_job(request.user_profile.dict(), job_data)
        return {"job_data": job_data, "match_analysis": match_result}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate")
def generate(request: GenerateRequest):
    try:
        artifacts = generate_full_package(request.user_profile.dict(), request.job_data, request.match_analysis)
        return artifacts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/complete-application")
async def complete_application(request: MatchRequest):
    try:
        data = generate_all_in_one(request.user_profile.dict(), request.job_description_text)
        return data
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/refine")
async def refine(request: RefineRequest):
    try:
        refined_results = refine_package(
            request.user_profile.dict(),
            request.job_data,
            request.match_analysis,
            request.original_results,
            chat_history=request.chat_history,
            refinement_prompt=request.refinement_prompt
        )
        return refined_results
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# IMPORTANT: Serve static files AFTER API routes
# Check if dist directory exists (it will in the Docker container)
if os.path.exists("dist"):
    # Serve static assets (js, css, etc.)
    app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")
    
    # Catch-all route to serve index.html for any non-API path
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Don't intercept API calls
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        
        file_path = os.path.join("dist", full_path)
        # If the requested file actually exists (like a favicon), serve it
        if os.path.isfile(file_path):
            from fastapi.responses import FileResponse
            return FileResponse(file_path)
            
        # Otherwise, fall back to index.html for React Router
        from fastapi.responses import FileResponse
        return FileResponse("dist/index.html")
else:
    @app.get("/")
    def read_root():
        return {"status": "RoleFit Backend Running (Frontend not built)"}
