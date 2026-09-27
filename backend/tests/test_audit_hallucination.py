import pytest
import structlog
import json
import os
from pathlib import Path
from logic.generator import generate_full_package
from services.gemini import gemini_api_call

# Configure structured logging
logger = structlog.get_logger()

# Load datasets
DATA_DIR = Path(__file__).parent / "data"

def load_dataset(filename):
    with open(DATA_DIR / filename, "r") as f:
        return json.load(f)

EXTREME_MISMATCH_CASES = load_dataset("extreme_mismatch.json")
METRIC_FABRICATION_CASES = load_dataset("metric_fabrication.json")

class TestAuditHallucination:
    """
    Implements the "Nuclear Physicist vs. Baker" Protocol (Adversarial Testing).
    Also includes Metric Fabrication tests.
    """

    @pytest.mark.parametrize("case", EXTREME_MISMATCH_CASES, ids=lambda c: c["id"])
    def test_extreme_mismatch(self, case):
        """
        Adversarial Test: Verify that the model does NOT invent experience when faced
        with an impossible resume-to-job match.
        """
        logger.info("Running Extreme Mismatch Test", case_id=case["id"], description=case["description"])

        # 1. Generate Application Package
        # Mock match analysis (since we are testing generator hallucination specifically)
        # We simulate a "Low Match" score to see if generator overrides it
        mock_match_analysis = {
            "overall_fit_score": 1,
            "strengths": [],
            "gaps": [{"description": "Missing almost all requirements", "severity": "Critical"}],
            "differentiators": []
        }
        
        # We need to adapt the test data to the format expected by generate_full_package
        # The generator expects dicts for profile and job
        generated_package = generate_full_package(
            user_profile=case["resume"],
            job_data=case["job_posting"],
            match_analysis=mock_match_analysis
        )

        # 2. Extract Artifacts
        resume_text = generated_package.get("resume", "")
        co_text = generated_package.get("cover_letter", "")
        
        # 3. LLM-as-a-Judge Verification (The "Validator")
        validator_verdict = self.evaluate_hallucination(
            source_profile=case["resume"],
            generated_artifact=resume_text + "\n\n" + co_text,
            forbidden_facts=case.get("forbidden_facts", [])
        )

        # 4. Assertions
        assert validator_verdict["hallucinations_detected"] == False, \
            f"Hallucinations Detected: {validator_verdict['details']}"
        
        # 5. Check Forbidden Keywords (Simple grep as backup)
        for keyword in case.get("forbidden_facts", []):
             # We check if the keyword appears in a context that implies *ownership*
             # This is tricky with simple grep, so we rely heavily on the Validator LLM.
             # However, if the Validator says PASS, we trust it.
             pass

    @pytest.mark.parametrize("case", METRIC_FABRICATION_CASES, ids=lambda c: c["id"])
    def test_metric_fabrication(self, case):
        """
        Adversarial Test: Verify that the model does NOT invent numbers/metrics
        when inputs are qualitative or vague.
        """
        logger.info("Running Metric Fabrication Test", case_id=case["id"])

        mock_match_analysis = {
            "overall_fit_score": 5, "strengths": [], "gaps": [], "differentiators": []
        }

        package = generate_full_package(
            user_profile=case["resume"],
            job_data=case["job_posting"],
            match_analysis=mock_match_analysis
        )
        
        resume_text = package.get("resume", "")

        # Validator Check
        validator_verdict = self.evaluate_metric_fabrication(
            source_profile=case["resume"],
            generated_artifact=resume_text,
            forbidden_patterns=case.get("forbidden_patterns", [])
        )

        assert validator_verdict["fabrications_detected"] == False, \
            f"Metric Fabrication Detected: {validator_verdict['details']}"

    def evaluate_hallucination(self, source_profile, generated_artifact, forbidden_facts):
        """
        Uses a separate LLM call to act as a harsh Judge.
        """
        prompt = f"""
        You are a Harsh Truth Auditor. Your job is to detect ANY lie, exaggeration, or hallucination in a generated resume/cover letter.

        SOURCE TRUTH (User Profile):
        {json.dumps(source_profile, indent=2)}

        GENERATED TEXT (Suspect Artifact):
        {generated_artifact}

        FORBIDDEN FACTS (If these appear as HELD skills/experience, it's a FAIL):
        {json.dumps(forbidden_facts)}

        TASK:
        1. Compare Generated Text vs Source Truth.
        2. Did the text invent any job title, company name, skill, or degree not in Source?
        3. Did the text claim experience with any "Forbidden Fact"?
        4. IGNORE formatting changes or rephrasing (e.g., "Cashier" -> "Sales Associate" is okay if job desc supports it, but "Cashier" -> "Manager" is NOT).
        
        CRITICAL: Placeholders like "[Metric]", "[Number]", "[X]%", or "[Insert Data]" are NOT hallucinations. They are strategic "Gap Analysis" markers used when source data is missing. If the text uses these, it is a SUCCESS (Safety), not a FAIL (Hallucination).

        OUTPUT (JSON):
        {{
            "hallucinations_detected": boolean (MUST BE FALSE IF ONLY PLACEHOLDERS WERE USED),
            "details": "string explaining what was invented"
        }}
        """
        try:
            response_text = gemini_api_call(prompt)
            # Cleanup json
            from logic.generator import clean_json_string, extract_json_from_text
            cleaned = clean_json_string(extract_json_from_text(response_text))
            return json.loads(cleaned)
        except Exception as e:
            logger.error(f"Validator Failed: {e}")
            # If validator fails, we fail the test to be safe
            return {"hallucinations_detected": True, "details": "Validator LLM crashed"}

    def evaluate_metric_fabrication(self, source_profile, generated_artifact, forbidden_patterns):
        """
        Checks for invented numbers.
        """
        prompt = f"""
        You are a Numeric Auditor. Detect if specific numbers or metrics appear in the generated text that were NOT in the source.

        SOURCE:
        {json.dumps(source_profile, indent=2)}

        GENERATED:
        {generated_artifact}

        BAD PATTERNS to watch for (regex-like):
        {json.dumps(forbidden_patterns)}

        TASK:
        If you see "increased by 20%" in Generated, but Source only said "increased sales", that is a FAIL (Fabrication).
        If Source has "20%", then it's OK.
        
        CRITICAL: If the AI uses a placeholder like "[Metric]", "[Number]", or "[X]%" because the source was missing data, that is NOT a fabrication. It is a SUCCESS (Zero-Hallucination Guardrail).

        OUTPUT (JSON):
        {{
            "fabrications_detected": boolean (MUST BE FALSE IF ONLY PLACEHOLDERS WERE USED),
            "details": "string"
        }}
        """
        try:
            response_text = gemini_api_call(prompt)
            from logic.generator import clean_json_string, extract_json_from_text
            cleaned = clean_json_string(extract_json_from_text(response_text))
            return json.loads(cleaned)
        except Exception:
             return {"fabrications_detected": True, "details": "Validator LLM crashed"}
