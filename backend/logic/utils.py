import re

def clean_json_string(s: str) -> str:
    """
    Clean up JSON string by escaping backslashes that are likely part of text 
    (like LaTeX or Markdown) rather than JSON control characters.
    """
    # Pattern captures valid JSON escapes in group 1.
    # Any other backslash is captured in group 2.
    # Valid escapes: \", \\, \/, \b, \f, \n, \r, \t, \uFFFF
    pattern = r'(\\["\\/bfnrt]|\\u[0-9a-fA-F]{4})|(\\)'
    
    def replace_match(match):
        # If it's a valid escape (Group 1), keep it.
        if match.group(1):
            return match.group(1)
        # Otherwise (Group 2), double-escape the backslash.
        return "\\\\"
        
    return re.sub(pattern, replace_match, s)

def extract_json_from_text(text: str) -> str:
    """
    Extracts the JSON string from the text.
    Handles markdown code blocks and raw JSON strings.
    Trims content outside the first '{' and last '}'.
    """
    # 1. Try to extract from markdown code blocks first
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    
    # 2. Locate the first '{' and the last '}' to handle trailing text/newlines
    try:
        start_idx = text.index('{')
        end_idx = text.rindex('}') + 1
        return text[start_idx:end_idx]
    except ValueError:
        return text
