import sys
import os
import json
import time
import google.generativeai as genai

# Add backend directory
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, '..'))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from logic.generator import refine_package, clean_json_string, extract_json_from_text
import services.gemini

def get_judge_model():
    print("Using gemini-flash-latest for judging to ensure availability.")
    return genai.GenerativeModel("gemini-flash-latest")

def evaluate_refinement(judge_model, instruction, original, refined):
    """
    Asks the Judge LLM if the instruction was followed.
    """
    prompt = f"""
    You are an AI Quality Assurance Judge. 
    
    INSTRUCTION GIVEN TO AI: "{instruction}"
    
    ORIGINAL TEXT (Snippet):
    {str(original)[:500]}
    
    REFINED TEXT (Snippet):
    {str(refined)[:500]}
    
    TASK:
    Did the AI follow the instruction?
    
    FORMAT:
    {{
      "followed_instruction": boolean,
      "reason": "string explaining why"
    }}
    
    JSON Output:
    """
    try:
        response = judge_model.generate_content(prompt)
        text = response.text
        cleaned = clean_json_string(extract_json_from_text(text))
        return json.loads(cleaned)
    except Exception as e:
        return {"followed_instruction": False, "reason": str(e)}

def run_refine_test():
    # 1. Setup Mock Data
    user_profile = {
        "full_name": "Test User",
        "skills": ["Python", "Java"],
        "experience": [{"title": "Dev", "company": "A", "duration": "1yr"}]
    }
    job_data = {"job_title": "Software Engineer", "company": "Tech Corp"}
    match_analysis = {}
    
    original_results = {
        "resume": "# Resume\n\nExperienced developer...",
        "cover_letter": "I am writing to apply...",
        "linkedin_message": "Hi, I am interested..."
    }
    
    instruction = "Make the cover letter extremely enthusiastic and use emojis."
    
    print(f"--- Testing Refinement ---")
    print(f"Instruction: {instruction}")
    
    try:
        # 2. Run Refinement
        start_time = time.time()
        refined_output = refine_package(
            user_profile, 
            job_data, 
            match_analysis, 
            original_results, 
            instruction
        )
        latency = time.time() - start_time
        print(f"Refinement successful ({latency:.2f}s)")
        
        # 3. Judge
        judge = get_judge_model()
        eval_result = evaluate_refinement(
            judge, 
            instruction, 
            original_results['cover_letter'], 
            refined_output['cover_letter']
        )
        
        print(f"Judge Verdict: {eval_result}")
        if eval_result.get('followed_instruction'):
            print("✅ TEST PASSED")
        else:
            print("❌ TEST FAILED")
            
    except Exception as e:
        print(f"Test Error: {e}")

if __name__ == "__main__":
    run_refine_test()
