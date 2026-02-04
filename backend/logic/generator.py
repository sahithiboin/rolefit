from services.gemini import gemini_api_call
from logic.validator import validate_and_correct
from logic.utils import clean_json_string, extract_json_from_text
import json
import re


def generate_ats_resume(user_profile: dict, job_data: dict, match_analysis: dict) -> str:
    """
    Generate an ATS-optimized resume.
    """
    # Create a concentrated view of the profile and match data for the prompt
    context = {
        "user": user_profile,
        "job": job_data,
        "match": match_analysis
    }
    
    prompt = f"""
    You are an Elite Global Career Coach & ATS Expert. Create a highly tailored, ATS-optimized resume.
    
    CRITICAL RULES:
    1. NO HALLUCINATIONS. Only use provided facts.
    2. ATS OPTIMIZATION: Use strong action verbs, quantifiable metrics, and clear section headers.
    3. TAILORING: Derive highlights from the Job Description and Match Analysis.
    
    JOB: {json.dumps(job_data)}
    USER: {json.dumps(user_profile)}
    MATCH: {json.dumps(match_analysis)}
    
    STRUCTURE:
    - Professional Header (Name, Title, Contact)
    - Professional Summary
    - Core Competencies / Technical Skills
    - Experience (Quantified Bullets)
    - Education / Certifications
    
    Output in Markdown:
    """
    
    return gemini_api_call(prompt, thinking_level="medium")

def generate_cover_letter(user_profile: dict, job_data: dict) -> str:
    """
    Generate a 3-paragraph cover letter.
    """
    prompt = f"""
    Write a 3-paragraph ATS-friendly professional cover letter.
    
    Job: {job_data.get('job_title')} at {job_data.get('company')}
    Candidate: {json.dumps(user_profile)}
    
    Requirements:
    - Hook: Why you're the TOP choice for this specific company.
    - Value: 2-3 specific, quantifiable achievements.
    - Closing: Professional call to action.
    - NO HALLUCINATIONS.
    
    Output in Markdown.
    """
    return gemini_api_call(prompt, thinking_level="medium")


def generate_full_package(user_profile: dict, job_data: dict, match_analysis: dict) -> dict:
    """
    Generate Resume, Cover Letter, and LinkedIn message in one single AI call to save quota.
    """
    prompt = f"""
    You are an Elite Career Coach. Generate a complete application package in JSON format.
    
    JOB: {json.dumps(job_data)}
    USER: {json.dumps(user_profile)}
    MATCH: {json.dumps(match_analysis)}
    
    KEYS: "resume", "cover_letter", "linkedin_message"
    - resume: ATS-optimized Markdown.
    - cover_letter: 3-paragraph Markdown.
    - linkedin_message: Short outreach.
    
    CRITICAL: No hallucinations. High-quality Markdown.
    """
    
    response = gemini_api_call(prompt, thinking_level="medium", response_mime_type="application/json")
        
    try:
        data = json.loads(response)
        initial_package = {
            "resume": data.get("resume", "Resume generation failed."),
            "cover_letter": data.get("cover_letter", "Cover letter generation failed."),
            "linkedin_message": data.get("linkedin_message", "Message generation failed.")
        }

        # VALIDATOR AGENT INTEGRATION
        # Ensure 0% Hallucination using the strict Validator
        validated_package = validate_and_correct(user_profile, initial_package)
        
        return validated_package
    except Exception as e:
        print(f"Error parsing Bulk JSON: {e}")
        return {
            "resume": "Bulk generation failed. Please try individually.",
            "cover_letter": "Bulk generation failed.",
            "linkedin_message": "Bulk generation failed."
        }

def refine_package(user_profile: dict, job_data: dict, match_analysis: dict, original_results: dict, refinement_prompt: str) -> dict:
    """
    Refine the application package based on user instructions.
    """
    prompt = f"""
    Refine the application package.
    Refinement Instruction: "{refinement_prompt}"
    
    ORIGINAL: {json.dumps(original_results)}
    USER: {json.dumps(user_profile)}
    
    TASK: Return refined "resume", "cover_letter", and "linkedin_message" in JSON.
    """
    
    response = gemini_api_call(prompt, thinking_level="medium", response_mime_type="application/json")
        
    try:
        return json.loads(response)
    except Exception as e:
        print(f"Error parsing Refine JSON: {e}")
        return original_results

def generate_all_in_one(user_profile: dict, job_description_text: str, thinking_level: str = "medium") -> dict:
    """
    The Ultimate Quota Saver: Does everything in one single AI call.
    Uses Native JSON Mode for stability and quality.
    """
    prompt = f"""
    You are an Elite Career Consultant & ATS Expert. Your task is to analyze a job description against a candidate profile and generate a complete, high-quality application suite.
    
    JOB DESCRIPTION:
    {job_description_text}
    
    CANDIDATE PROFILE:
    {json.dumps(user_profile, indent=2)}
    
    TASK:
    1. MATCH ANALYSIS: Calculate a 1-10 match score, identify top 3 strengths, top 3 gaps, and top 3 differentiators. 
    2. RESUME: Create an Elite Markdown resume tailored specifically to this job. 
       - Formatting: Use Standard Professional English. No country-specific terminology unless explicitly in the profile.
       - Structure: Clear headers (Professional Summary, Core Competencies, Experience, Education).
       - Experience bullets: START each bullet with strong ACTION VERBS. QUANTIFY results (%, $, time saved).
       - ATS: Include critical keywords from the job description naturally.
    3. COVER LETTER: Write a professional 3-paragraph Markdown cover letter focusing on core value proposition.
    4. LINKEDIN: Write a short, high-conversion outreach message.
    5. QUIRKY VERDICT: Generate a "Quirky Verdict" with a Gen-Z, Fun, and Viral tone matching the fit score.
    6. RECOMMENDATIONS: Suggest 2-3 specific certifications or skills for upskilling.
    7. RESUME PRO TIP: Analyze if the candidate's profile lacks quantifiable metrics (numbers, %, $, growth markers) in their experience.
       - Provide ONE personalized "Resume Pro Tip" to help them quantify their impact.
       - TONE: Gen-Z, Fun, and Viral (e.g., "Bestie, your impact is sending, but where are the receipts? Add some numbers to make HR go 👁️👄👁️").
       - IMPORTANT: Do not hallucinate numbers. Suggest *where* they should add them based on their actual experience.
    
    CRITICAL RULES:
    - NO HALLUCINATIONS. Only use provided facts.
    - RESPOND IN VALID JSON ONLY.
    
    JSON STRUCTURE:
    {{
      "match_analysis": {{
        "overall_fit_score": float (1-10),
        "summary_title": "string",
        "summary_text": "string",
        "strengths": [{{ "description": "...", "evidence": "..." }}],
        "gaps": [{{ "description": "...", "severity": "..." }}],
        "differentiators": [{{ "description": "...", "evidence": "..." }}]
      }},
      "verdict": {{
        "label": "string",
        "message": "string"
      }},
      "job_data": {{
        "job_title": "string",
        "company": "string"
      }},
      "results": {{
        "resume": "string (Markdown)",
        "cover_letter": "string (Markdown)",
        "linkedin_message": "string"
      }},
      "recommendations": [
        {{
          "title": "string",
          "reason": "string",
          "youtube_query": "string"
        }}
      ],
      "resume_pro_tip": "string"
    }}
    """
    
    # Use native JSON mode
    response = gemini_api_call(prompt, thinking_level=thinking_level, response_mime_type="application/json")
    
    try:
        data = json.loads(response, strict=False)
        return data
    except Exception as e:
        print(f"Error parsing Mega JSON: {e}")
        raise e

