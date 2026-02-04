from logic.generator import generate_all_in_one
import json

user_profile = {
    "personal_info": {"name": "Test User"},
    "experience": [{"title": "Software Engineer", "company": "Tech Corp", "description": "Developed features for the web app."}],
    "skills": ["Python", "JS"]
}
jd = "Looking for a Senior Python Developer to optimize our high-traffic APIs and lead a team of 5."

result = generate_all_in_one(user_profile, jd)
print(f"PRO TIP: {result.get('resume_pro_tip')}")
