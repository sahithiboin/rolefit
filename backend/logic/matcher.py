import re

def match_profile_to_job(user_profile: dict, job_data: dict) -> dict:
    """
    Match user profile against job requirements.
    """
    
    # 1. MATCH REQUIRED SKILLS
    required_skill_matches = []
    user_skills = user_profile.get("skills", [])
    
    for req_skill in job_data.get("required_skills", []):
        match_strength = find_skill_match(req_skill, user_skills)
        required_skill_matches.append({
            "requirement": req_skill,
            "match_strength": match_strength,
            "evidence": req_skill if match_strength != "missing" else None
        })
    
    # 2. MATCH EXPERIENCE LEVEL
    user_years = float(user_profile.get("total_years_experience", 0))
    required_years_str = job_data.get("experience_years", "")
    required_years = parse_years_requirement(required_years_str)
    experience_match = calculate_experience_match(user_years, required_years)
    
    # 3. MATCH CERTIFICATIONS
    cert_matches = []
    user_certs = [c.get("name", "") for c in user_profile.get("certifications", [])]
    for req_cert in job_data.get("certifications_required", []):
        has_cert = any(req_cert.lower() in c.lower() for c in user_certs)
        cert_matches.append({
            "certification": req_cert,
            "has_it": has_cert
        })
    
    # 4. CALCULATE KEYWORD COVERAGE
    keywords = job_data.get("keywords", {})
    if not isinstance(keywords, dict):
        keywords = {"critical": [], "important": [], "supporting": []}
    keyword_coverage = calculate_keyword_coverage(user_profile, keywords)
    
    # 5. CALCULATE OVERALL FIT SCORE
    fit_score = calculate_overall_fit(
        required_skill_matches,
        experience_match,
        cert_matches,
        keyword_coverage
    )
    
    # 6. STRENGTHS
    strengths = identify_top_strengths(required_skill_matches, experience_match, cert_matches, user_profile)
    
    # 7. GAPS
    gaps = identify_gaps(required_skill_matches, experience_match, cert_matches)
    
    # 8. DIFFERENTIATORS
    differentiators = identify_differentiators(user_profile, job_data, required_skill_matches)

    # 9. SUMMARY TEXT
    summary = generate_summary(fit_score, job_data, user_profile)

    return {
        "overall_fit_score": round(fit_score, 1),
        "strengths": strengths,
        "gaps": gaps,
        "differentiators": differentiators,
        "keyword_coverage": keyword_coverage,
        "summary_title": summary["title"],
        "summary_text": summary["text"]
    }


def find_skill_match(required_skill, user_skills):
    # Normalize
    req = required_skill.lower()
    user_skills_lower = [s.lower() for s in user_skills]
    
    if req in user_skills_lower:
        return "strong"
    
    # Simple partial match: check if skill word appears in any user skill
    # (In a real system, we'd use semantic similarity or a thesaurus)
    for skill in user_skills_lower:
        if req in skill or skill in req:
            return "partial"
            
    return "missing"

def parse_years_requirement(years_str):
    # Extract first number found
    match = re.search(r'\d+', str(years_str))
    if match:
        return float(match.group())
    return 0.0

def calculate_experience_match(user_years, required_years):
    if required_years == 0: return 1.0
    if user_years >= required_years: return 1.0
    # Partial credit
    return min(1.0, user_years / required_years)

def create_profile_text(user_profile):
    text = f"{user_profile.get('full_name', '')} {user_profile.get('additional_info', '')}"
    text += " " + " ".join(user_profile.get("skills", []))
    for exp in user_profile.get("experience", []):
        text += f" {exp.get('company', '')} {exp.get('role', '')} {exp.get('description', '')}"
    for edu in user_profile.get("education", []):
        text += f" {edu.get('school', '')} {edu.get('degree', '')} {edu.get('field', '')}"
    return text

def calculate_keyword_coverage(user_profile, job_keywords):
    profile_text = create_profile_text(user_profile).lower()
    
    coverage = {}
    total_matched = 0
    total_keywords_count = 0
    
    categories = ["critical", "important", "supporting"]
    for category in categories:
        keywords = job_keywords.get(category, [])
        matched = 0
        for kw in keywords:
            if kw.lower() in profile_text:
                matched += 1
        
        count = len(keywords)
        coverage[category] = {
            "total": count,
            "matched": matched,
            "percentage": (matched / count * 100) if count > 0 else 0
        }
        total_matched += matched
        total_keywords_count += count
        
    coverage["overall_percentage"] = (total_matched / total_keywords_count * 100) if total_keywords_count > 0 else 0
    return coverage

def calculate_overall_fit(skill_matches, exp_match, cert_matches, keyword_coverage):
    # Skills score
    strong = len([m for m in skill_matches if m["match_strength"] == "strong"])
    partial = len([m for m in skill_matches if m["match_strength"] == "partial"])
    total = len(skill_matches)
    skills_score = ((strong * 10) + (partial * 6)) / total if total > 0 else 5
    
    # Experience score
    experience_score = exp_match * 10
    
    # Cert score
    certs_met = len([c for c in cert_matches if c["has_it"]])
    certs_req = len(cert_matches)
    cert_score = (certs_met / certs_req * 10) if certs_req > 0 else 7
    
    # Keyword score
    keyword_score = keyword_coverage["overall_percentage"] / 10
    
    score = (
        (skills_score * 0.35) +
        (experience_score * 0.30) +
        (cert_score * 0.15) +
        (keyword_score * 0.20)
    )
    return max(1.0, min(10.0, score)) # Clamp 1-10

def identify_top_strengths(skill_matches, exp_match, cert_matches, user_profile):
    strengths = []
    for match in skill_matches:
        if match["match_strength"] == "strong":
            strengths.append({
                "category": "skill",
                "description": match["requirement"],
                "evidence":  f"Matched in profile skills"
            })
    if exp_match >= 1.0:
        strengths.append({
            "category": "experience",
            "description": f"{user_profile.get('total_years_experience')} years experience",
            "evidence": "Meets or exceeds role requirements"
        })
    return strengths[:3]

def identify_gaps(skill_matches, exp_match, cert_matches):
    gaps = []
    for match in skill_matches:
        if match["match_strength"] == "missing":
            gaps.append({"type": "skill", "description": match["requirement"], "severity": "Critical skill missing"})
    if exp_match < 0.8:
         gaps.append({"type": "experience", "description": "Experience gap", "severity": "Below required years"})
    return gaps[:3]

def identify_differentiators(user_profile, job_data, skill_matches):
    differentiators = []
    
    # 1. Preferred Skills (Bonus)
    user_skills_lower = [s.lower() for s in user_profile.get("skills", [])]
    for pref in job_data.get("preferred_skills", []):
        if pref.lower() in user_skills_lower:
             differentiators.append({
                "description": pref,
                "evidence": "Preferred skill match"
             })
             
    # 2. Education (Masters/PhD)
    for edu in user_profile.get("education", []):
        degree = edu.get("degree", "").lower()
        if "master" in degree or "phd" in degree or "mba" in degree:
            differentiators.append({
                "description": f"Advanced Degree: {edu.get('degree')}",
                "evidence": f"From {edu.get('school')}"
            })

    # 3. High Experience
    req_years = parse_years_requirement(job_data.get("experience_years", "0"))
    user_years = user_profile.get("total_years_experience", 0)
    if user_years > req_years + 3:
        differentiators.append({
            "description": "Deep Industry Experience",
            "evidence": f"{user_years} years (exceeds requirement)"
        })

    return differentiators[:3]

def generate_summary(fit_score, job_data, user_profile):
    job_title = job_data.get("job_title", "target role")
    
    if fit_score >= 8.5:
        return {
            "title": f"Excellent candidate for {job_title}",
            "text": f"Your profile demonstrates a high degree of alignment with the {job_title} requirements. You possess the critical technical skills and experience needed to hit the ground running. Your background strongly supports the core responsibilities of this role."
        }
    elif fit_score >= 7.0:
        return {
            "title": f"Strong candidate for {job_title}",
            "text": f"You are a solid match for the {job_title} position. You meet the core requirements and bring relevant experience. Addressing the identified gaps in your application materials will further strengthen your candidacy."
        }
    elif fit_score >= 5.0:
        return {
            "title": f"Potential match for {job_title}",
            "text": f"You have some transferable skills relevant to the {job_title} role, but there are significant gaps in specific technical requirements or experience. Emphasize your adaptability and willingness to learn in your cover letter."
        }
    else:
        return {
            "title": f"Low alignment for {job_title}",
            "text": f"This role appears to require a different skill set or experience level than what is currently prominent in your profile. Consider highlighting adjacent skills or seeking roles that better match your current core competencies."
        }
