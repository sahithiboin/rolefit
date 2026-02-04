import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

def get_gemini_client():
    """Returns the Gemini 3 Client instance."""
    if not API_KEY:
        raise ValueError("GEMINI_API_KEY not set")
    return genai.Client(api_key=API_KEY)

def gemini_api_call(prompt: str, thinking_level: str = "medium", response_mime_type: str = "text/plain") -> str:
    """
    Wrapper for Gemini 3 API call with Thinking Support.
    Thinking levels: 'minimal', 'low', 'medium', 'high'.
    Default is 'medium' to balance quality and speed (<90s).
    """
    try:
        client = get_gemini_client()
        
        # Build config with thinking support and optional JSON mode
        config = types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(
                include_thoughts=True
            ),
            response_mime_type=response_mime_type
        )
        
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
            config=config
        )
        
        return response.text
    except Exception as e:
        print(f"Gemini 3 API Error: {e}")
        raise e
