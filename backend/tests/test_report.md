# AI Model Test Report

**Date:** 2026-03-06 11:41:59
**Total Scenarios:** 3

## Summary
- **Pass Rate:** 3/3 (100.0%)
- **Avg Latency:** 7.59s

## Detailed Results
### 1. Scenario: perfect_match
- **Status:** ✅ PASS
- **Score:** 5/5
- **Latency:** 6.99s
- **Truthfulness:** 5/5 - The AI followed the candidate profile with 100% accuracy. It maintained the correct company names, years of experience (7 years), team size (5 developers), and specific performance metrics (40% latency reduction). While it specified AWS services like EC2, S3, and RDS in the resume to match the JD, this is considered a logical mapping of the candidate's 'AWS' skill rather than a hallucination of new experience.
- **Relevance:** 5/5 - The output is exceptionally well-tailored to the 'Senior' nature of the role. It prioritizes the candidate's leadership experience and architectural contributions, which were explicitly requested or preferred in the job description. The match analysis correctly identifies minor gaps (like explicit CI/CD ownership) that weren't in the profile, showing the AI is actually comparing the two texts rather than just merging them.

---
### 2. Scenario: career_pivot
- **Status:** ✅ PASS
- **Score:** 5/5
- **Latency:** 6.73s
- **Truthfulness:** 5/5 - The AI maintained strict adherence to the candidate's history. It used the correct company names, dates, and educational background. While it 'translated' marketing tasks into product-centric language (e.g., calling a content list a 'backlog'), it did not hallucinate entirely new roles, degrees, or employers.
- **Relevance:** 5/5 - The AI perfectly executed the 'career pivot' scenario. It emphasized the candidate's user research and Agile skills, which were explicitly mentioned in both the profile and the job description. The match score of 7.5 aligns with the 'Medium Match' expectation for a pivot, and the 'gaps' section correctly identifies the lack of direct product management experience.

---
### 3. Scenario: mismatch
- **Status:** ✅ PASS
- **Score:** 5/5
- **Latency:** 9.06s
- **Truthfulness:** 5/5 - The AI adhered strictly to the provided candidate profile. It maintained the correct job title (Junior Graphic Designer), company (Design Studio), graduation year (2023), and specific skill set (Adobe, Figma, etc.) without hallucinating any engineering-specific experience or qualifications to force a match.
- **Relevance:** 5/5 - In the context of the 'mismatch' scenario, the AI performed perfectly by assigning an 'overall_fit_score' of 1.0. It correctly identified that there is no intersection between the candidate's skills and the JD. The generated documents are 'relevant' to the prompt because they accurately reflect the candidate's inability to meet the JD's requirements while suggesting logical career pivots.

---
