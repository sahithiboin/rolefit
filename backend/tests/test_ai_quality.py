import sys
import os
import json
import time
import google.generativeai as genai

# Add backend directory to sys.path to allow imports
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, '..'))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from logic.generator import generate_all_in_one, clean_json_string, extract_json_from_text
import services.gemini # Triggers dotenv load

# Configure the deprecated genai library used for the judge
genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))

def get_judge_model():
    """
    Tries to get a stronger model for evaluation.
    """
    # Fallback to flash as it is reliable and available
    print("Using gemini-flash-latest for judging to ensure availability.")
    return genai.GenerativeModel("gemini-flash-latest")

def evaluate_with_llm(judge_model, scenario, generated_output):
    """
    Asks the Judge LLM to score the output.
    """
    prompt = f"""
    You are an AI Quality Assurance Judge. Your task is to evaluate the quality of an AI-generated job application package.
    
    SCENARIO ID: {scenario['id']}
    SCENARIO DESCRIPTION: {scenario['description']}
    
    CANDIDATE PROFILE:
    {json.dumps(scenario['user_profile'], indent=2)}
    
    JOB DESCRIPTION:
    {scenario['job_description_text']}
    
    GENERATED OUTPUT TO EVALUATE:
    {json.dumps(generated_output, indent=2)}
    
    EVALUATION CRITERIA:
    1. Truthfulness (Score 1-5): Did the AI hallucinate any skills, companies, or experience not in the profile? (5 = Perfect Factuality)
    2. Relevance (Score 1-5): How well does the Resume/Cover Letter tailor the candidate's actual experience to the job requirements? (5 = Highly Tailored)
    3. JSON Validity (Score 1 or 5): Is the output valid JSON structure as expected? (5 = Valid)
    
    TASK:
    Return a JSON object with scores and reasoning.
    
    FORMAT:
    {{
      "truthfulness_score": int,
      "truthfulness_reason": "string",
      "relevance_score": int,
      "relevance_reason": "string",
      "overall_quality_score": int (Average of above),
      "verdict": "PASS" or "FAIL" (Pass if Overall > 3 and Truthfulness >= 4)
    }}
    
    JSON Output:
    """
    
    try:
        response = judge_model.generate_content(prompt)
        text = response.text
        cleaned = clean_json_string(extract_json_from_text(text))
        return json.loads(cleaned)
    except Exception as e:
        print(f"Judge failed: {e}")
        return {
            "truthfulness_score": 0,
            "relevance_score": 0,
            "overall_quality_score": 0,
            "verdict": "ERROR",
            "reason": str(e)
        }

def run_tests():
    dataset_path = os.path.join(current_dir, 'data', 'dataset.json')
    if not os.path.exists(dataset_path):
        print(f"Error: Dataset not found at {dataset_path}")
        return

    with open(dataset_path, 'r') as f:
        scenarios = json.load(f)

    judge_model = get_judge_model()
    results = []
    
    print(f"Running tests on {len(scenarios)} scenarios...")
    
    for scenario in scenarios:
        print(f"\n--- Testing Scenario: {scenario['id']} ---")
        start_time = time.time()
        
        # 1. Run Generation (Integration Test)
        try:
            output = generate_all_in_one(scenario['user_profile'], scenario['job_description_text'])
            latency = time.time() - start_time
            print(f"Generation successful ({latency:.2f}s)")
            
            # 2. Run Evaluation (LLM Judge)
            print("Running Judge Evaluation...")
            eval_result = evaluate_with_llm(judge_model, scenario, output)
            
            result_entry = {
                "scenario_id": scenario['id'],
                "latency_seconds": round(latency, 2),
                "generation_success": True,
                "evaluation": eval_result
            }
            print(f"Verdict: {eval_result.get('verdict')} (Score: {eval_result.get('overall_quality_score')})")
            
        except Exception as e:
            print(f"Generation failed: {e}")
            result_entry = {
                "scenario_id": scenario['id'],
                "latency_seconds": 0,
                "generation_success": False,
                "error": str(e)
            }
        
        results.append(result_entry)
        time.sleep(2) # Avoid rate limits

    # Generate Report
    generate_markdown_report(results)

def generate_markdown_report(results):
    report_path = os.path.join(current_dir, 'test_report.md')
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    
    md = f"# AI Model Test Report\n\n"
    md += f"**Date:** {timestamp}\n"
    md += f"**Total Scenarios:** {len(results)}\n\n"
    
    md += "## Summary\n"
    passed = sum(1 for r in results if r.get('evaluation', {}).get('verdict') == "PASS")
    md += f"- **Pass Rate:** {passed}/{len(results)} ({(passed/len(results))*100:.1f}%)\n"
    avg_latency = sum(r['latency_seconds'] for r in results) / len(results)
    md += f"- **Avg Latency:** {avg_latency:.2f}s\n\n"
    
    md += "## Detailed Results\n"
    
    for i, res in enumerate(results):
        md += f"### {i+1}. Scenario: {res['scenario_id']}\n"
        if res['generation_success']:
            eval_data = res['evaluation']
            icon = "✅" if eval_data.get('verdict') == "PASS" else "❌"
            md += f"- **Status:** {icon} {eval_data.get('verdict')}\n"
            md += f"- **Score:** {eval_data.get('overall_quality_score')}/5\n"
            md += f"- **Latency:** {res['latency_seconds']}s\n"
            md += f"- **Truthfulness:** {eval_data.get('truthfulness_score')}/5 - {eval_data.get('truthfulness_reason')}\n"
            md += f"- **Relevance:** {eval_data.get('relevance_score')}/5 - {eval_data.get('relevance_reason')}\n"
        else:
            md += f"- **Status:** ❌ FAILED (Generation Error)\n"
            md += f"- **Error:** {res.get('error')}\n"
        md += "\n---\n"
        
    with open(report_path, 'w') as f:
        f.write(md)
    
    print(f"\nReport generated at {report_path}")

if __name__ == "__main__":
    run_tests()
