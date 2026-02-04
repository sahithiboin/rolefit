from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class JobDescriptionInput(BaseModel):
    text: str

class UserProfile(BaseModel):
    linkedin_url: Optional[str] = None
    full_name: str
    email: Optional[str] = None
    skills: List[str] = []
    experience: List[Dict[str, Any]] = []
    education: List[Dict[str, Any]] = []
    certifications: List[Dict[str, Any]] = [] # Changed to list of dicts to handle name/issuer
    projects: List[Dict[str, Any]] = []
    awards: List[str] = []
    languages: List[str] = []
    additional_info: Optional[str] = None
    total_years_experience: float = 0.0

class MatchRequest(BaseModel):
    user_profile: UserProfile
    job_description_text: str

class GenerateRequest(BaseModel):
    user_profile: UserProfile
    job_data: Dict[str, Any]
    match_analysis: Dict[str, Any]
class RefineRequest(BaseModel):
    user_profile: UserProfile
    job_data: Dict[str, Any]
    match_analysis: Dict[str, Any]
    original_results: Dict[str, Any]
    refinement_prompt: str

class ResumeInput(BaseModel):
    resume_text: str
