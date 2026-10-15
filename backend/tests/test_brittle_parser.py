import pytest
import re

def brittle_parser(text):
    """
    Simulates a 'brittle' enterprise ATS parser.
    It strips all markdown styling, normalizes whitespace, 
    and checks if the content flows logically.
    """
    # Strip markdown headers
    text = re.sub(r'^#+\s*', '', text, flags=re.MULTILINE)
    # Strip bold/italic
    text = text.replace('**', '').replace('*', '').replace('_', '')
    # Strip bullet points
    text = re.sub(r'^\s*[-•○]\s*', '', text, flags=re.MULTILINE)
    # Normalize whitespace
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    return "\n".join(lines)

def test_resume_parsability():
    sample_resume = """
# JANE DOE
**Senior Software Engineer** | jane@example.com | LinkedIn/janedoe

## PROFESSIONAL SUMMARY
Results-driven Senior Full-Stack Engineer with 8+ years of experience.

## TECHNICAL SKILLS
- Languages: Python, JavaScript, TypeScript
- Frameworks: React, FastAPI, Node.js

## PROFESSIONAL EXPERIENCE
**Tech Corp** | Senior Engineer | 2020 - Present
- Led the migration of legacy systems to a microservices architecture.
- Improved system performance by 40% through query optimization.

**Startup Inc** | Full-Stack Developer | 2017 - 2020
- Built a real-time collaboration tool using WebSockets.
"""
    
    parsed = brittle_parser(sample_resume)
    
    # Verify section headers exist and are contiguous
    assert "PROFESSIONAL SUMMARY" in parsed
    assert "TECHNICAL SKILLS" in parsed
    assert "PROFESSIONAL EXPERIENCE" in parsed
    
    # Verify content isn't jumbled
    assert "JANE DOE" in parsed.split('\n')[0]
    
    # Check if experience items are in order
    index_tech_corp = parsed.find("Tech Corp")
    index_startup = parsed.find("Startup Inc")
    assert index_tech_corp < index_startup
    
    print("\n[SUCCESS] Brittle Parser Test Passed: Content remains linear and logically ordered.")

if __name__ == "__main__":
    test_resume_parsability()
