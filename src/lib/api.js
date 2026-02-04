const API_BASE = '/api';

export const api = {
    async matchProfile(profile, jobDescriptionText) {
        const response = await fetch(`${API_BASE}/match`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_profile: profile,
                job_description_text: jobDescriptionText
            })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Match failed with status ${response.status}`);
        }
        return response.json();
    },

    async generatePackage(profile, jobData, matchAnalysis) {
        const response = await fetch(`${API_BASE}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_profile: profile,
                job_data: jobData,
                match_analysis: matchAnalysis
            })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Generation failed with status ${response.status}`);
        }
        return response.json();
    },

    async completeApplication(profile, jobDescriptionText) {
        const response = await fetch(`${API_BASE}/complete-application`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_profile: profile,
                job_description_text: jobDescriptionText
            })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Application generation failed with status ${response.status}`);
        }
        return response.json();
    },

    async refinePackage(refineData) {
        const response = await fetch(`${API_BASE}/refine`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(refineData)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Refinement failed with status ${response.status}`);
        }
        return response.json();
    },

    async parseResumeFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/parse-resume-upload`, {
            method: 'POST',
            body: formData
            // Note: browser sets Content-Type to multipart/form-data with boundary
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Resume parsing failed with status ${response.status}`);
        }
        return response.json();
    },

    async parseResume(resumeText) {
        const response = await fetch(`${API_BASE}/parse-resume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resume_text: resumeText })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Resume parsing failed with status ${response.status}`);
        }
        return response.json();
    }
};

export const transformProfileForBackend = (formData) => {
    // Split key string "skills" into array
    const skillList = formData.skills
        ? formData.skills.split(',').map(s => s.trim()).filter(s => s.length > 0)
        : [];

    // Calculate approx years of experience (very rough estimate for now)
    const totalYears = formData.experience.reduce((acc, exp) => {
        // In a real app we'd parse dates. defaulting to 1 year per entry for MVP fallback
        return acc + 1;
    }, 0);

    return {
        full_name: formData.linkedin.fullName,
        email: formData.linkedin.email,
        linkedin_url: formData.linkedin.url,
        skills: skillList,
        experience: formData.experience,
        education: formData.education,
        certifications: formData.certifications,
        projects: formData.projects,
        awards: formData.awards,
        languages: formData.languages,
        additional_info: formData.additional,
        total_years_experience: totalYears
    };
};
