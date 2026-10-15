import json
from logic.generator import generate_all_in_one

user_profile = {
    "resume": "Software Engineer with 5 years experience in Python and React.",
    "skills": ["Python", "React", "AWS"]
}
job_desc = "Looking for a Senior Software Engineer with Python and AWS."

try:
    res = generate_all_in_one(user_profile, job_desc)
    print(json.dumps(res, indent=2))
except Exception as e:
    print(f"Error: {e}")
