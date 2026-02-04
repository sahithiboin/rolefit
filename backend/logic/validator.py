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
    You are a Strict Fact-Checking Algorithm. Your goal is to ENSURE 0% HALLUCINATION rate.
    
    SOURCE DATA (User Profile):
    {json.dumps(source_profile, indent=2)}
    
    GENERATED CONTENT:
    {combined_text}
    
    TASK:
    Identify ANY skill, job title, company, degree, or metric in the GENERATED CONTENT that is NOT supported by the SOURCE DATA.
    
    RULES:
    - If the user has "Retail", and generated says "DevOps", that is a HALLUCINATION.
    - If user has no metrics, and generated says "increased by 50%", that is a HALLUCINATION.
    - Synonyms are OK (e.g. "Coded" -> "Developed").
    - Inferred soft skills are OK (e.g. "Teamwork").
    - HARD SKILLS, COMPANIES, DATES, TITLES must be exact.
    
    OUTPUT JSON:
    {{
        "has_hallucinations": boolean,
        "correction_plan": "string (explain what to remove/fix)",
        "safe_resume": "string (The resume text with ALL hallucinations deleted/replaced)",
        "safe_cover_letter": "string (The cover letter text with ALL hallucinations deleted/replaced)",
        "safe_linkedin_message": "string (The linkedin message with ALL hallucinations deleted/replaced)"
    }}
    """
    
    try:
        response = gemini_api_call(prompt)
        cleaned = clean_json_string(extract_json_from_text(response))
        validation_result = json.loads(cleaned)
        
        if validation_result.get("has_hallucinations", False):
            logger.warn("Hallucinations Detected - Applying Fixes", 
                        plan=validation_result.get("correction_plan"))
            
            # Apply the "Fast Path" fix: Use the safe versions returned by the validator
            # This avoids a full 2nd generation round-trip which saves time
            generated_package["resume"] = validation_result.get("safe_resume", generated_package["resume"])
            generated_package["cover_letter"] = validation_result.get("safe_cover_letter", generated_package["cover_letter"])
            generated_package["linkedin_message"] = validation_result.get("safe_linkedin_message", generated_package["linkedin_message"])
            
            return generated_package
        
        else:
            logger.info("Validation Passed - No Hallucinations")
            return generated_package

    except Exception as e:
        logger.error(f"Validator Error: {e}")
        # Fail open or fail closed?
        # For "Indisputable Trust", we should probably warn or return original 
        # checking safely.
        return generated_package
