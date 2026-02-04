import sys
import os

# Add current directory to path so we can import from logic
sys.path.append(os.getcwd())

from logic.generator import clean_json_string
import json

def test_clean_json():
    # consistent testing requires raw strings for backslashes
    bad_json = r'{"resume": "Experience with C++, Python, and LaTeX \\alpha. Also using \\_ for underline."}'
    print(f"Original: {bad_json}")
    
    cleaned = clean_json_string(bad_json)
    print(f"Cleaned:  {cleaned}")
    
    try:
        data = json.loads(cleaned)
        print("SUCCESS: JSON parsed successfully")
        print(f"Parsed value: {data['resume']}")
    except Exception as e:
        print(f"FAILURE: JSON parse failed: {e}")

    # Test with valid escapes to ensure we don't break them
    valid_json = r'{"text": "Line 1\nLine 2\tTabbed \\ Backslash \" Quote"}'
    cleaned_valid = clean_json_string(valid_json)
    print(f"\nOriginal Valid: {valid_json}")
    print(f"Cleaned Valid:  {cleaned_valid}")
    try:
        data = json.loads(cleaned_valid)
        print("SUCCESS: Valid JSON parsed successfully")
        # Check if content is preserved
        expected = "Line 1\nLine 2\tTabbed \\ Backslash \" Quote"
        if data['text'] == expected:
             print("SUCCESS: Content preserved correctly")
        else:
             print(f"FAILURE: Content changed! Got: {repr(data['text'])}")
    except Exception as e:
        print(f"FAILURE: Valid JSON parse failed: {e}")

if __name__ == "__main__":
    test_clean_json()
