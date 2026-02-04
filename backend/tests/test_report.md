# AI Model Test Report

**Date:** 2026-02-01 10:59:53
**Total Scenarios:** 3

## Summary
- **Pass Rate:** 3/3 (100.0%)
- **Avg Latency:** 14.68s

## Detailed Results
### 1. Scenario: perfect_match
- **Status:** ✅ PASS
- **Score:** 5/5
- **Latency:** 15.42s
- **Truthfulness:** 5/5 - The AI accurately reflected all information from the Candidate Profile. It synthesized related technical facts (e.g., listing specific AWS services like EC2, S3, RDS when 'AWS' was listed, which aligns with the JD), but did not hallucinate experience, titles, or quantified results.
- **Relevance:** 5/5 - The tailoring is exceptional (a 9.8 match). The generated package successfully integrates all core requirements (Python 5+ years, AWS, Docker/K8s) and heavily emphasizes the 'plus' factors like leadership and quantifiable results (40% latency reduction) throughout the resume, cover letter, and match summary.

---
### 2. Scenario: career_pivot
- **Status:** ✅ PASS
- **Score:** 5/5
- **Latency:** 15.55s
- **Truthfulness:** 5/5 - All skills, experience points, titles, and companies used in the generated resume and cover letter are directly sourced from the provided candidate profile. No information was hallucinated, and the claims (e.g., 150% traffic increase) are supported by the input data.
- **Relevance:** 5/5 - The output demonstrates exceptional tailoring for this specific pivot scenario. The generated documents successfully re-frame Marketing and User Research experience as core Product Owner competencies, directly addressing the job's 'highly desirable' requirement. The resume summary, skills section, and experience bullets are expertly optimized to use PO language (e.g., 'Backlog Prioritization,' 'Roadmap Definition,' 'Agile Project Leadership') and directly highlight the candidate's experience in 'bridging the gap between business and technical teams' (by claiming collaboration with engineering and design teams).

---
### 3. Scenario: mismatch
- **Status:** ✅ PASS
- **Score:** 4/5
- **Latency:** 13.07s
- **Truthfulness:** 5/5 - The AI flawlessly maintained factuality. It did not invent any engineering experience, technical skills, or false credentials for Sam Lee. Both the resume and cover letter explicitly acknowledged the candidate's Junior Graphic Designer role and the lack of alignment with the VP of Engineering requirements.
- **Relevance:** 2/5 - Due to the extreme nature of the mismatch, high relevance is impossible. The generated documents make a minimal effort to tailor the design experience by focusing on vague transferable skills like 'collaboration,' 'strategic vision,' and 'adapting to evolving technological landscapes' (referencing tools like Figma). However, this tailoring does not address the core requirements (15+ years engineering, executive management, architecture expertise), making the application documents themselves largely irrelevant to the role.

---
