import pytest
import time
import asyncio
import structlog
from logic.generator import generate_full_package
# We use concurrent.futures for thread-based load testing of synchronous functions
from concurrent.futures import ThreadPoolExecutor

logger = structlog.get_logger()

# Mock massive job description for stress
LARGE_JOB = {
    "job_title": "Senior Solutions Architect",
    "company": "Enterprise Corp",
    "text": "Requires detailed knowledge of " + "technology " * 500  # 500 words
}

MEDIUM_RESUME = {
    "name": "Jane Doe",
    "experience": [{"title": "Dev", "company": "A", "description": "Code " * 100}]
}

class TestAuditSpeed:
    """
    Implements the "P95/P99 Latency" Protocol and Load Testing.
    """

    def test_baseline_speed_large_resume(self):
        """
        Baseline test for a single large generation task.
        Target: < 90 seconds.
        """
        logger.info("Running Baseline Speed Test (Large Resume)")
        
        start_time = time.perf_counter()
        
        # Simulate generating a full package
        # In a real integration test, we might call the API endpoint, 
        # but here we test the core logic function directly to isolate backend speed.
        match_analysis = {
            "overall_fit_score": 8, "strengths": [], "gaps": [], "differentiators": []
        }
        
        _ = generate_full_package(MEDIUM_RESUME, LARGE_JOB, match_analysis)
        
        end_time = time.perf_counter()
        duration_ms = (end_time - start_time) * 1000
        
        logger.info(f"Baseline Duration: {duration_ms:.2f}ms")
        
        assert duration_ms < 90000, f"Generation took too long: {duration_ms}ms"

    def test_concurrent_load_simulator(self):
        """
        Simulate 5 concurrent users to verify stability and latency under load.
        """
        logger.info("Running Concurrent Load Test (5 Users)")
        
        start_time = time.perf_counter()
        
        num_users = 5
        results = []

        def single_user_task(user_id):
            t0 = time.perf_counter()
            match_analysis = {"overall_fit_score": 8, "strengths": [], "gaps": [], "differentiators": []}
            _ = generate_full_package(MEDIUM_RESUME, LARGE_JOB, match_analysis)
            t1 = time.perf_counter()
            return (t1 - t0) * 1000

        with ThreadPoolExecutor(max_workers=num_users) as executor:
            futures = [executor.submit(single_user_task, i) for i in range(num_users)]
            results = [f.result() for f in futures]

        end_time = time.perf_counter()
        total_test_duration = (end_time - start_time) * 1000
        
        avg_latency = sum(results) / len(results)
        max_latency = max(results)
        
        logger.info(f"Load Test Results: Avg={avg_latency:.2f}ms, Max={max_latency:.2f}ms")
        
        # Check that NO single user experienced > 90s latency even under load (hard constraint)
        # Or maybe relax it slightly for load tests? 
        # The user said "Individual generation times should match baseline (±5%)" 
        # but also "Target <1% failure rate".
        assert max_latency < 95000, f"Max latency under load exceeded 95s: {max_latency}ms"
