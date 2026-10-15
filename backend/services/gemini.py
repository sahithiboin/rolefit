import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GOOGLE_API_KEY")

def get_gemini_client():
    """Returns the Gemini 3 Client instance."""
    if not API_KEY:
        raise ValueError("GOOGLE_API_KEY not set")
    return genai.Client(api_key=API_KEY)

def gemini_api_call(prompt: str, model_name: str = "gemini-3-flash-preview", thinking_level: str = "medium", response_mime_type: str = "text/plain") -> str:
    """
    Wrapper for Gemini 3 API call with Thinking Support.
    Thinking levels: 'minimal', 'low', 'medium', 'high'.
    model_name: Selects between 3.0-flash (Drafts) and 3.1-pro (Surgical Edits).
    NOTE: Context Caching is not currently utilized as the architecture dynamically injects unique JD/User context under the 32k minimum token threshold for caching.
    """
    try:
        client = get_gemini_client()
        
        # Build config with thinking support
        # NOTE: If thinking_level is explicitly supported by the SDK version, it can be added. 
        # For now, we enable include_thoughts to ensure reasoning is active.
        config = types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(
                include_thoughts=True
            ),
            response_mime_type=response_mime_type
        )
        
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=config
        )
        
        return response.text
    except Exception as e:
        print(f"Gemini 3 API Error: {e}")
        raise e
