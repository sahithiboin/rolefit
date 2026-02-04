import pytest
import structlog
import json
from pathlib import Path
from logic.generator import generate_full_package
from services.gemini import gemini_api_call

logger = structlog.get_logger()
DATA_DIR = Path(__file__).parent / "data"

def load_dataset(filename):
    with open(DATA_DIR / filename, "r") as f:
        return json.load(f)

NARRATIVE_DRIFT_CASES = load_dataset("narrative_drift.json")

class TestAuditReputation:
    """
    Implements the "Narrative Drift" Detection Protocol.
    """

    @pytest.mark.parametrize("case", NARRATIVE_DRIFT_CASES, ids=lambda c: c["id"])
    def test_narrative_drift_consistency(self, case):
        """
        Adversarial Test: Verify tone and seniority consistency across artifacts.
        """
        logger.info("Running Narrative Drift Test", case_id=case["id"])

        mock_match_analysis = {"overall_fit_score": 7, "strengths": [], "gaps": [], "differentiators": []}
        
        package = generate_full_package(case["resume"], case["job_posting"], mock_match_analysis)
        
        # We need to analyze specific artifacts
        artifacts_text = f"""
        RESUME: {package.get('resume', '')}
        COVER_LETTER: {package.get('cover_letter', '')}
        LINKEDIN: {package.get('linkedin_message', '')}
        """

        verdict = self.evaluate_narrative_consistency(
            source_profile=case["resume"],
            artifacts_text=artifacts_text,
            expected_tone=case.get("expected_tone", ""),
            forbidden_tones=case.get("forbidden_tones", [])
        )

        assert verdict["consistency_score"] >= 8, \
            f"Consistency Score too low: {verdict['consistency_score']}. Drift: {verdict['details']}"
            
        assert not verdict["severe_drift_detected"], \
            f"Severe Drift Detected: {verdict['details']}"

    def evaluate_narrative_consistency(self, source_profile, artifacts_text, expected_tone, forbidden_tones):
        """
        Uses an LLM Judge to score consistency (0-10).
        """
        prompt = f"""
        You are a Brand Consistency Auditor. Evaluate if the tone/seniority is consistent across all application artifacts.

        SOURCE PROFILE (Truth):
        {json.dumps(source_profile, indent=2)}

        GENERATED ARTIFACTS:
        {artifacts_text}

        EXPECTED TONE: {expected_tone}
        FORBIDDEN TONES: {json.dumps(forbidden_tones)}

        TASK:
        1. Does the Resume tone match the Cover Letter tone? (e.g. both humble, or both expert)
        2. Does the LinkedIn message sound like the same person?
        3. Is there "Drift"? (e.g. Resume says 1 year exp, Cover Letter claims "seasoned expert").

        OUTPUT (JSON):
        {{
            "consistency_score": integer (0-10),
            "severe_drift_detected": boolean,
            "details": "string explanation"
        }}
        """
        try:
            response_text = gemini_api_call(prompt)
            from logic.generator import clean_json_string, extract_json_from_text
            cleaned = clean_json_string(extract_json_from_text(response_text))
            return json.loads(cleaned)
        except Exception:
             return {"consistency_score": 0, "severe_drift_detected": True, "details": "Judge Failed"}
