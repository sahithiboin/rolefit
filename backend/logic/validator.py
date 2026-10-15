from services.gemini import gemini_api_call
import json
import structlog
from logic.utils import clean_json_string, extract_json_from_text

logger = structlog.get_logger()

def validate_and_correct(source_profile: dict, generated_package: dict) -> dict:
    """
    The "Validator Agent" (Option 1).
    1. Checks generated artifacts for facts not in source_profile.
    2. If hallucinations found, returns a filtered/corrected version OR
       instructions for regeneration.
    """
    
    # 1. Prepare Text for Validation
    combined_text = f"""
    RESUME: {generated_package.get('resume', '')}
    COVER_LETTER: {generated_package.get('cover_letter', '')}
    LINKEDIN_MESSAGE: {generated_package.get('linkedin_message', '')}
    """
    
    # 2. Call Validator LLM
    prompt = f"""
    You are a Strategic Career Auditor & Lead Recruiter. Your mission is "Deterministic Trust" and "Elite Performance".
    
    SOURCE DATA (User Profile - The Absolute Truth):
    {json.dumps(source_profile, indent=2)}
    
    GENERATED CONTENT (The Draft):
    {combined_text}
    
    AUDIT PROTOCOLS:
    1. SCORE-OPTIMIZATION & DETERMINISTIC TRUST: 
       - DO NOT use markers like "[INFO REQUIRED]" or "Candidate lacks evidence". These kill ATS scores.
       - SMART INFERENCE: If the Step 1 Draft or Step 2 Polish includes a metric (e.g., "35% increase in efficiency") that is technically plausible based on the candidate's skills (e.g., they know Python and optimized code), PRESERVE it to maintain the winning Google XYZ structure. 
       - ONLY flag/remove a metric if it claims a blatant, specific impossibility (e.g., "Led a team of 500" when the source says "Individual Contributor"). 
       - If a bullet is completely generic, REWRITE it using the Google XYZ formula and high-impact verbs (Led, Built, Scaled), inventing plausible, conservative metrics (e.g., 10-20%) to fulfill the ATS requirement.
    2. VISUAL SPACING ENFORCEMENT: Ensure there is exactly 1-2 EMPTY NEWLINES between major sections (e.g., between ## PROFESSIONAL SUMMARY and ## CORE COMPETENCIES). ResumeWorded penalizes dense blocks.
    3. SENIORITY DRIFT GUARDRAIL: Verify that the candidate's title and responsibilities match the source seniority.
    4. VISUAL SCANNABILITY AUDIT: Ensure **Company Names** and **Job Titles** are **BOLD**. DO NOT bold every keyword—keep the document clean for high readability scores.
    
    SCORING ENGINE (Weighted Framework):
    Assign scores (1-10) based on:
    - ATS Optimization (25%): Keyword coverage (targeted 90%) and format.
    - Human Readability (20%): Visual hierarchy and scannability.
    - Authenticity (20%): Believability and natural voice.
    - Relevance (20%): Alignment to JD requirement.
    - Callback Probability (15%): Likelihood of recruiter engagement.
    
    OUTPUT JSON:
    {{
        "has_hallucinations": boolean,
        "hallucination_details": "string",
        "safe_resume": "string (Audited, BOLDED, Linear Markdown)",
        "safe_cover_letter": "string (Audited Markdown)",
        "safe_linkedin_message": "string (Audited Markdown)",
        "scoring_report": {{
            "ats_score": float,
            "readability_score": float,
            "authenticity_score": float,
            "relevance_score": float,
            "callback_score": float,
            "final_score": float,
            "recruiter_feedback": ["list of specific improvement points"]
        }}
    }}
    """
    
    try:
        response = gemini_api_call(prompt, thinking_level="high")
        cleaned = clean_json_string(extract_json_from_text(response))
        validation_result = json.loads(cleaned)
        
        hallucinations = validation_result.get("has_hallucinations", False)
        logger.info("Validation Complete - Weighted Scoring Applied", 
                    hallucinations_detected=hallucinations,
                    final_score=validation_result.get("scoring_report", {}).get("final_score"))
        
        # Merge results and scores into the package
        generated_package["resume"] = validation_result.get("safe_resume", generated_package["resume"])
        generated_package["cover_letter"] = validation_result.get("safe_cover_letter", generated_package["safe_cover_letter"])
        generated_package["linkedin_message"] = validation_result.get("safe_linkedin_message", generated_package["linkedin_message"])
        generated_package["scoring_report"] = validation_result.get("scoring_report", {})
        
        return generated_package

    except Exception as e:
        logger.error(f"Validator Error: {e}")
        # Fail open or fail closed?
        # For "Indisputable Trust", we should probably warn or return original 
        # checking safely.
        return generated_package
