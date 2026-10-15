from services.gemini import gemini_api_call
from logic.validator import validate_and_correct
from logic.utils import clean_json_string, extract_json_from_text
import json
import re


def normalize_bullets(text: str) -> str:
    """
    Programmatic post-processor that ensures every bullet point (• or •)
    is on its own line as a proper Markdown list item (- ).
    
    This corrects the LLM's tendency to output bullets inline, e.g.:
    'Company | Title • Did X. • Did Y.' => proper list lines.
    """
    if not text:
        return text

    # Step 1: Split any inline bullets that appear mid-paragraph.
    # This handles: "text • bullet" -> "text\n• bullet"
    text = re.sub(r'([^\n])\s*[•·]\s+', lambda m: m.group(1) + '\n- ', text)

    # Step 2: Replace any remaining standalone "• " or "• " at start of line
    text = re.sub(r'^[•·]\s*', '- ', text, flags=re.MULTILINE)

    # Step 3: Ensure there's a blank line before list items (after non-list lines)
    # so that Markdown parsers treat them as proper lists
    lines = text.split('\n')
    result = []
    for i, line in enumerate(lines):
        stripped = line.strip()
        # If this is a bullet line and previous non-empty line is not a bullet line
        if stripped.startswith('- '):
            if i > 0:
                prev = lines[i - 1].strip()
                if prev and not prev.startswith('- ') and not prev.startswith('#'):
                    result.append('')  # add blank line before bullet block starts
        result.append(line)
    
    return '\n'.join(result)

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
    You are an AI Architect & Lead Recruiter at a Tier-1 Tech Company (FAANG). Create a high-caliber, ATS-optimized resume designed to score 90+ on ResumeWorded.
    
    STRATEGIC CONSTRAINTS (Human Layer):
    1. GOOGLE XYZ FORMULA: Mandatory formatting for EVERY bullet point: "Accomplished [X] as measured by [Y], by doing [Z]".
    2. ANTI-AI SLOP FILTER: No "meticulously", "orchestrated", "spearheaded", "passionate". Use "Led", "Delivered", "Optimized", "Built", "Scaled".
    3. VISUAL SCANNABILITY: You MUST **BOLD** every **Company Name**, **Job Title**, and **Primary Keyword/Technology** (e.g., **Python**, **AWS**, **Agile**).
    
    ALGORITHMIC INTEGRITY (Machine Layer):
    1. NATURAL KEYWORD DENSITY: Identify top 15 keywords from the JD. Repeat critical terms 2-3x naturally throughout. Target 90% keyword match.
    2. STRUCTURAL LIMITS:
       - Summary: Strictly 3-4 lines.
       - Core Competencies: Exactly 16-20 items grouped by category.
       - Experience: 4-6 bullets for recent roles, 3-4 for older.
    3. LINEAR LAYOUT: Output Markdown that supports a 100% single-column PDF.
    
    JOB: {json.dumps(job_data)}
    USER: {json.dumps(user_profile)}
    MATCH: {json.dumps(match_analysis)}
    
    STRUCTURE (Strict Order):
    - **Header**: Name, Contact (Include [LinkedIn](URL) hyperlinked).
    - **Professional Summary** (3-4 lines)
    - **Professional Experience** (Bold titles/companies, XYZ bullets starting with \n• )
    - **Skills and Certifications**
        ## Technical Skills:
            - **Category Name:** Skill 1, Skill 2, ...
        ## Core Competencies:
            - Dense list of Keywords, Skill 3, Skill 4, ...
        ## Certifications & Training:
            - Certification Name (Date)
    - **Education**
    - **Projects**
    - **Awards** (if any)
    
    Output in Markdown:
    """
    
    return gemini_api_call(prompt, thinking_level="high")

def generate_cover_letter(user_profile: dict, job_data: dict) -> str:
    """
    Generate a 3-paragraph cover letter.
    """
    prompt = f"""
    Write a 3-paragraph "Human-Caliber" professional cover letter.
    
    CONSTRAINTS:
    - ANTI-AI SLOP: No "passionate", "meticulously", or "orchestrated".
    - COMPANY ALIGNMENT: Use {job_data.get('company')}'s internal vernacular (e.g., Leadership Principles).
    - XYZ IMPACT: Describe achievements using the XYZ formula.
    
    Job: {job_data.get('job_title')} at {job_data.get('company')}
    Candidate: {json.dumps(user_profile)}
    
    Requirements:
    - Hook: Why you're the TOP choice for this specific company.
    - Value: 2-3 specific, quantifiable achievements described in detail.
    - Closing: Professional call to action.
    - NO HALLUCINATIONS.
    
    Output in Markdown.
    """
    return gemini_api_call(prompt, thinking_level="high")


def polish_resume(resume_text: str, job_description_text: str) -> str:
    """
    Step 2 of the Hybrid Pipeline: Surgical Polish using Gemini 3.1 Pro.
    Identifies 3 weak spots and rewrites them using the Google XYZ formula and JD keywords.
    """
    prompt = f"""
    You are an Elite Resume Editor.
    
    JOB DESCRIPTION:
    {job_description_text}
    
    RESUME DRAFT:
    {resume_text}
    
    TASK:
    1. Identify exactly 3 bullet points under the "PROFESSIONAL EXPERIENCE" section that are weak, lack quantifiable metrics, or miss core JD keywords (the 'Hidden Intent').
    2. Rewrite ONLY those 3 bullet points to be stronger, directly solving the core business problems in the JD.
    3. Use the Google XYZ formula: "Accomplished [X] as measured by [Y], by doing [Z]".
    
    Return ONLY valid JSON matching this exact structure:
    {{
      "replacements": [
        {{
          "original": "exact original bullet text from the draft",
          "revised": "new Google XYZ formatted bullet (MUST start with \n• )"
        }}
      ]
    }}
    """
    response = gemini_api_call(prompt, model_name="gemini-3-flash-preview", thinking_level="minimal", response_mime_type="application/json")
    try:
        data = json.loads(clean_json_string(extract_json_from_text(response)), strict=False)
        polished_resume = str(resume_text)
        if "replacements" in data:
            for rep in data["replacements"]:
                original = rep.get("original", "")
                revised = rep.get("revised", "")
                if original and revised:
                    # Force verticality: ensure the revised bullet starts with a newline if it's not the first line
                    revised_vertical = revised.strip()
                    if not revised_vertical.startswith("\n"):
                        revised_vertical = "\n" + revised_vertical
                    
                    if original in polished_resume:
                        polished_resume = polished_resume.replace(original, revised_vertical)
        
        # Final Safety: Regex to catch any clumps (bullet preceded by text instead of newline)
        polished_resume = re.sub(r'([^\n])\s*•', r'\1\n•', polished_resume)
        
        # Normalize all bullet characters to proper Markdown list items
        polished_resume = normalize_bullets(polished_resume)
        
        return polished_resume
    except Exception as e:
        print(f"Error in Polish Step: {e}")
        return resume_text

def generate_full_package(user_profile: dict, job_data: dict, match_analysis: dict) -> dict:
    """
    Generate Resume, Cover Letter, and LinkedIn message in one single AI call to save quota.
    """
    prompt = f"""
    You are an Elite Career Coach & Resume Strategist. Generate a complete application package in JSON format designed to score 90+ on Jobscan and ResumeWorded.
    
    JOB DATA: {json.dumps(job_data)}
    USER DATA: {json.dumps(user_profile)}
    MATCH ANALYSIS: {json.dumps(match_analysis)}
    
    CRITICAL RESUME RULES (The 'Winning Vibe' Framework):
    1. ENERGETIC PROSE: Use active, confident language. Sound like an elite performer, not a literal bot.
    2. NATURAL KEYWORD DENSITY: Identify the top 20 keywords from the job data and ensure 2-3x natural repetition throughout the resume.
    3. VISUAL SCANNABILITY: You MUST **bold** every **Company Name** and **Job Title**. DO NOT bold keywords inside the paragraph to avoid clutter.
    4. SMART INFERENCE: If the user profile proves they have a skill, you are AUTHORIZED to hypothesize reasonable impact metrics (e.g., "improving workflow efficiency by 15%") to fulfill the Google XYZ formula.
    5. STRICT STRUCTURE (Must follow these exact headers with 2 NEWLINES between sections):
       - **Header**: Name, Contact (Include [LinkedIn](URL) hyperlinked).
       - ## PROFESSIONAL SUMMARY
       (Strictly 3-4 lines with high keyword density)
       - ## PROFESSIONAL EXPERIENCE 
       (HIDDEN INTENT ANALYSIS: Analyze the Job Description to extract the 'Hidden Intent'. Rewrite achievement bullets using the Google XYZ formula. Use Plausible Metrics. Every bullet MUST start on its own line with \n• )
       - ## SKILLS AND CERTIFICATIONS
         ## Technical Skills:
         - **Category:** Skill 1, Skill 2, ...
         ## Core Competencies:
         - Keyword 1, Keyword 2, ...
         ## Certifications & Training:
         - Title (Date)
       - ## EDUCATION
       - ## PROJECTS
       - ## AWARDS
    
    KEYS: "resume", "cover_letter", "linkedin_message"
    - resume: ATS-optimized Markdown using the strict structure above.
    - cover_letter: 3-paragraph Markdown focusing on XYZ impacts.
    - linkedin_message: Short outreach highlighting PR/Work Authorization if applicable.
    
    Respond in JSON only.
    """
    
    # Step 1: Rapid Draft (Flash 3.0)
    response = gemini_api_call(prompt, model_name="gemini-3-flash-preview", thinking_level="medium", response_mime_type="application/json")
        
    try:
        data = json.loads(response)
        initial_resume = data.get("resume", "")
        # Step 2: Surgical Polish (Pro 3.1)
        polished = polish_resume(initial_resume, json.dumps(job_data)) if initial_resume else ""
        final_resume = normalize_bullets(polished) if polished else "Resume generation failed."

        initial_package = {
            "resume": final_resume,
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

def refine_package(user_profile: dict, job_data: dict, match_analysis: dict, original_results: dict, chat_history: list = None, refinement_prompt: str = None) -> dict:
    """
    Refine the application package based on user instructions.
    """
    history_context = ""
    if chat_history:
        history_context = "CHAT HISTORY:\n" + "\n".join([f"{msg.get('role', 'user').upper()}: {msg.get('message', '')}" for msg in chat_history])
    
    instruction = refinement_prompt or "Continue the refinement based on chat history."

    prompt = f"""
    You are a Gen Z AI Career Coach Copilot. Refine the user's application package based on their latest instruction and the ongoing chat history.
    
    LATEST INSTRUCTION: "{instruction}"
    
    {history_context}
    
    CURRENT PACKAGE:
    {json.dumps(original_results)}
    
    CANDIDATE BACKGROUND:
    {json.dumps(user_profile)}
    
    TARGET JOB:
    {json.dumps(job_data)}
    
    CRITICAL RULES:
    1. ONLY modify the specific sections, sentences, or bullet points requested by the LATEST INSTRUCTION. Keep everything else identical.
    2. Write an `agent_message`: A friendly, hyper-modern Gen Z style response (e.g., using terms like "lowkey", "no cap", "bestie", "slay", "it's giving") explaining exactly what you changed. Keep it brief (1-3 sentences max).
    3. FULL RE-EVALUATION REQUIRED: After applying the changes, re-evaluate the ENTIRE updated resume against the FULL target job description. The `match_analysis` MUST reflect a holistic assessment of the candidate against the job — not just the section that was changed.
    4. `overall_fit_score` MUST be a decimal number strictly between 1.0 and 10.0. NEVER use a 0-100 scale. Example: 8.5 is valid. 85 is INVALID.
    5. MUST RETURN valid JSON only, no other text.
    
    JSON STRUCTURE MUST BE:
    {{
      "resume": "updated resume markdown",
      "cover_letter": "updated cover letter markdown",
      "linkedin_message": "updated linkedin message",
      "match_analysis": {{
        "overall_fit_score": <decimal between 1.0 and 10.0>,
        "summary_title": "string",
        "summary_text": "string",
        "strengths": [{{"description": "...", "evidence": "..."}}],
        "gaps": [{{"description": "...", "severity": "..."}}],
        "differentiators": [{{"description": "...", "evidence": "..."}}]
      }},
      "agent_message": "Your Gen Z response explaining changes"
    }}
    """
    
    response = gemini_api_call(prompt, thinking_level="medium", response_mime_type="application/json")
        
    try:
        cleaned = clean_json_string(extract_json_from_text(response))
        data = json.loads(cleaned, strict=False)
        if "resume" in data and data["resume"]:
            data["resume"] = normalize_bullets(data["resume"])
        
        # Clamp the score server-side as a safety net
        if "match_analysis" in data and "overall_fit_score" in data["match_analysis"]:
            raw_score = float(data["match_analysis"]["overall_fit_score"])
            # If AI returned a 0-100 value, convert it to 1-10
            if raw_score > 10:
                raw_score = raw_score / 10.0
            data["match_analysis"]["overall_fit_score"] = round(min(max(raw_score, 1.0), 10.0), 1)
        
        return data
    except Exception as e:
        print(f"Error parsing Refine JSON: {e}")
        return original_results


def generate_all_in_one(user_profile: dict, job_description_text: str, thinking_level: str = "high") -> dict:
    """
    The Ultimate Quota Saver: Does everything in one single AI call.
    Uses Native JSON Mode for stability and quality.
    """
    prompt = f"""
    You are an AI Architect & Lead Recruiter at a Tier-1 Tech Company (FAANG). Your PRIMARY TASK is to generate a winning resume that scores 90+ on scanners like ResumeWorded while passing a 6-second human lead recruiter review.
    
    JOB DESCRIPTION:
    {job_description_text}
    
    CANDIDATE PROFILE:
    {json.dumps(user_profile, indent=2)}
    
    HYBRID-OPTIMIZATION TASK LIST:
    1. MAXIMUM KEYWORD DENSITY (Crucial): Extract the top 25 hard skills and keywords from the Job Description. You MUST inject at least 85% of these keywords into the candidate's resume naturally. Repeat the top 5 keywords at least 3 times each.
    2. STRICT ATS STRUCTURE & BOLDING (Highest Weight): Let the layout be EXACTLY according to these headings:
       - **Header**: Name on line 1. Phone | Email | [LinkedIn](URL) | Location on line 2.
       - ## PROFESSIONAL SUMMARY
       (Strictly 3-4 lines. You MUST pack this paragraph with as many JD keywords as organically possible.)
       - ## PROFESSIONAL EXPERIENCE
       (Format EXACTLY as: Company | Job Title | Dates | Location)
       (HIDDEN INTENT ANALYSIS: Analyze the Job Description to extract the 'Hidden Intent' - the core business problems. Rewrite the top 3 bullet points of the most recent job to directly solve those problems using the user's experience and the Google XYZ formula: "Accomplished [X] as measured by [Y], by doing [Z]". 
       CRITICAL: Every single bullet MUST start on its own NEW LINE with the character \n• followed by exactly one space.)
       - ## SKILLS AND CERTIFICATIONS
         ## Technical Skills:
         - **Category Name:** Skill 1, Skill 2, Skill 3...
         ## Core Competencies:
         (CRITICAL: This section MUST BE a raw, dense list of 15-25 exact keywords from the JD that the user possesses. Format as a single block of text separated by COMMAS. Example: Agile, Python, AWS, Technical Program Management, Risk Mitigation)
         ## Certifications & Training:
         - Certification (Date)
       - ## EDUCATION
       (Format: Degree | University | Year | Location. Each degree on its own NEW LINE starting with \n• )
       - ## PROJECTS
       - ## AWARDS
       - VISUAL SCANNABILITY: **BOLD** all **Company Names** and **Job Titles**. DO NOT bold keywords inside the paragraph to keep the layout clean (Only bold headers/titles).
       - ANTI-AI SLOP FILTER: Strip out "meticulously", "orchestrated", "spearheaded", "passionate". Replace with "Built", "Led", "Optimized".
       - COMPANY SEMANTIC MAPPING: Align vocabulary with target company culture (e.g. Amazon "Customer Obsession").
       - LINEAR LAYOUT ENFORCEMENT: Output Markdown that is 100% single-column.
    3. COVER LETTER: 3-paragraph impact letter using the same linguistic filters.
    4. LINKEDIN: Professional outreach.
     5. QUIRKY VERDICT: A short, fun GenZ-style verdict on the overall fit. Use Gen Z slang (e.g., lowkey, no cap, it's giving, slay, mid, ate that, bussin, rent free, understood the assignment, main character energy) — be honest but uplifting, NEVER mean or harsh. Must include a clear recommendation tag: "YAY 🎉" (strong fit, apply now), "NAY 💀" (big gaps, risky), or "MAYBE 👀" (decent fit, apply with tweaks). Keep it 2-3 sentences max.
 
    
    CRITICAL RULES:
    - SMART INFERENCE vs. HALLUCINATION: If the candidate has the experience, hypothesis plausible metrics (e.g., "20% reduction") to satisfy the XYZ requirement. This is common practice in elite resume coaching to represent impact. Do not invent company names or degrees.
    - VISUAL SPACING: Use exactly 2 NEWLINES between sections (## PROFESSIONAL SUMMARY, ## SKILLS AND CERTIFICATIONS, etc.).
    - NO SENIORITY DRIFT. If the candidate is an Intern, keep them as an Intern. Do not inflate to "Manager" or "Lead".
    - NO PAGE LIMIT.
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
      "resume_pro_tip": "string — A single, punchy GenZ-flavored resume tip specific to this candidate's resume and the JD. Use fun slang (lowkey, no cap, bestie, slay, that's not it, understood the assignment, etc.) but keep it actionable and kind. Max 2 sentences."
    }}
    """
    
    # Step 1: Rapid Draft (Flash 3.0)
    response = gemini_api_call(prompt, model_name="gemini-3-flash-preview", thinking_level="medium", response_mime_type="application/json")
    
    try:
        cleaned_text = clean_json_string(extract_json_from_text(response))
        data = json.loads(cleaned_text, strict=False)
        
        # --- PROGRAMMATIC KEYWORD INJECTION (ATS GUARANTEE) ---
        # The LLM is often too cautious (zero-hallucination) to output 15+ keywords.
        # We manually inject the user's actual skills + implied JD skills into the competencies block.
        if "results" in data and "resume" in data["results"]:
            initial_resume = data["results"]["resume"]
            # Step 2: Surgical Polish (Pro 3.1) + normalize bullets immediately
            resume_text = normalize_bullets(polish_resume(initial_resume, job_description_text))
            data["results"]["resume"] = resume_text
            
            # Extract basic skills from profile to guarantee they are included
            profile_skills = user_profile.get("skills", [])
            if isinstance(profile_skills, str):
                profile_skills = [s.strip() for s in profile_skills.split(",")]
            
            # Extract bolded terms from the resume (these are the JD keywords the AI identified)
            import re
            bolded_terms = re.findall(r'\*\*([A-Za-z0-9\s/.-]+)\*\*', resume_text)
            # Filter out common non-skill bolded words
            ignore_words = {"Professional Summary", "Experience", "Education", "Certifications", "Core", "Competencies"}
            scraped_skills = [term.strip() for term in bolded_terms if len(term.strip()) > 2 and term.strip() not in ignore_words]

            # Simple heuristic: if we have skills, make sure they are in the competencies block
            if "## SKILLS AND CERTIFICATIONS" in resume_text:
                parts = resume_text.split("## Core Competencies:")
                if len(parts) == 2:
                    top_part = parts[0]
                    bottom_part = parts[1]
                    
                    # Find the next section header
                    next_heading_idx = bottom_part.find("\n## ")
                        
                    if next_heading_idx != -1:
                        competencies_block = bottom_part[:next_heading_idx].strip()
                        rest_of_resume = bottom_part[next_heading_idx:]
                        
                        # Clean up existing competencies and merge
                        existing = [s.strip().replace("**", "").replace("[INFO REQUIRED: ", "").replace("]", "") for s in competencies_block.split(",")]
                        combined_skills = list(set(existing + profile_skills + scraped_skills))
                        
                        # Sort by length (shortest first often looks better for skills) and limit to exactly 20
                        combined_skills.sort(key=len)
                        final_skills = [s for s in combined_skills if s and "Candidate lacks" not in s and len(s) < 30][:25]
                        
                        new_competencies_block = "\n" + ", ".join(final_skills) + "\n"
                        
                        data["results"]["resume"] = top_part + "## Core Competencies:" + new_competencies_block + rest_of_resume

        # VALIDATOR AGENT INTEGRATION: Ensure 0% Hallucination + Impact Quality
        if "results" in data:
            data["results"] = validate_and_correct(user_profile, data["results"])
            # Final bullet normalization — force all • to proper markdown list items
            if "resume" in data["results"]:
                data["results"]["resume"] = normalize_bullets(data["results"]["resume"])
            
        return data
    except Exception as e:
        print(f"Error parsing Mega JSON: {e}")
        raise e


