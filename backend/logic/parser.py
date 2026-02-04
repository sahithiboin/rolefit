import json
from services.gemini import gemini_api_call

def parse_job_description(job_text: str) -> dict:
    """
    Parse job description into structured data using Gemini.
    """
    prompt = f"""
    Analyze this job description and extract structured information.
    
    Job Description:
    {job_text}
    
    Extract and return in JSON format:
    {{
        "job_title": "exact title from posting",
        "company": "company name if mentioned",
        "location": "location if mentioned",
        "seniority_level": "Entry/Mid/Senior/Lead/Principal/Director/VP/C-Level",
        "required_skills": ["skill1", "skill2"],
        "preferred_skills": ["skill1", "skill2"],
        "core_responsibilities": ["responsibility1", "responsibility2"],
        "keywords": {{
            "critical": ["terms appearing 3+ times"],
            "important": ["terms appearing 2 times"],
            "supporting": ["terms appearing 1 time"]
        }},
        "experience_years": "e.g., 5-7 years",
        "certifications_required": ["cert1", "cert2"],
        "certifications_preferred": ["cert1"],
        "technical_tools": ["tool1", "tool2"],
        "methodologies": ["Agile", "Scrum"],
        "soft_skills": ["leadership", "communication"]
    }}
    
    Rules:
    - Only extract information explicitly stated.
    - Don't infer or assume anything.
    - Separate "required" vs "preferred" carefully.
    - Return valid JSON only, no markdown formatting.
    """
    
    response_text = gemini_api_call(prompt, thinking_level="minimal", response_mime_type="application/json")
    
    try:
        job_data = json.loads(response_text)
        
        if isinstance(job_data, list):
            if len(job_data) > 0:
                job_data = job_data[0]
            else:
                job_data = {}

        # Validate required fields
        required_fields = ["job_title", "required_skills", "core_responsibilities", "keywords"]
        for field in required_fields:
            if field not in job_data:
                job_data[field] = [] if field != "job_title" else "Unknown"
        
        return job_data
    except json.JSONDecodeError:
        print(f"Failed to parse JSON: {response_text}")
        return {
            "job_title": "Unknown",
            "required_skills": [],
            "core_responsibilities": [],
            "keywords": {"critical": [], "important": [], "supporting": []}
        }

def parse_resume(resume_text: str) -> dict:
    """
    Parse resume text.
    """
    prompt = f"""
    Analyze the following raw resume text and extract structured profile information.
    
    Resume Text:
    {resume_text}
    
    Extract and return in JSON format matching this EXACT structure:
    {{
        "linkedin": {{
            "fullName": "Full Name",
            "email": "Email Address",
            "url": "LinkedIn Profile URL"
        }},
        "experience": [
            {{
                "company": "Company Name",
                "role": "Title",
                "duration": "Start - End Date",
                "location": "City, Country",
                "description": "Key responsibilities and achievements"
            }}
        ],
        "education": [
            {{
                "school": "University/College",
                "degree": "Degree / Major",
                "duration": "Start - End Date",
                "location": "City, Country"
            }}
        ],
        "skills": ["Skill 1", "Skill 2"],
        "projects": [
            {{
                "name": "Project Name",
                "description": "What you built/did",
                "tech": "Technologies used"
            }}
        ],
        "certifications": [
            {{
                "name": "Cert Name",
                "issuer": "Issuing Org"
            }}
        ],
        "awards": ["Award 1", "Award 2"],
        "languages": ["Language 1", "Language 2"],
        "additional": "Brief summary or other relevant info"
    }}
    
    Rules:
    - Only extract information explicitly stated.
    - If a section is missing, return an empty list or empty strings for fields.
    - Ensure the output is valid, strictly formatted JSON.
    - No markdown formatting in the response.
    """
    
    response_text = gemini_api_call(prompt, thinking_level="minimal", response_mime_type="application/json")
    
    try:
        profile_data = json.loads(response_text)
        return profile_data
    except json.JSONDecodeError:
        print(f"Failed to parse Resume JSON: {response_text}")
        return {{
            "linkedin": {{"fullName": "", "email": "", "url": ""}},
            "experience": [],
            "education": [],
            "skills": [],
            "projects": [],
            "certifications": [],
            "awards": [],
            "languages": [],
            "additional": ""
        }}
