import os
import sys
import json
import time
from litellm import completion

# Load env from the same directory
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

def extract_skills(text: str, retries: int = 5) -> list:
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        print("[ExtractSkills] ERROR: GROQ_API_KEY not set", file=sys.stderr)
        return []
        
    prompt = f"""You are a senior technical recruiter.
Analyze the following developer resume / profile details and extract an open-ended list of all actual skills, programming languages, databases, cloud providers, frameworks, and technologies mentioned or evidenced.

RULES:
- Do not use any predefined list. Extract whatever real technologies are genuinely present (e.g. React, Docker, Python, Java, AWS, Kubernetes, etc.).
- Exclude soft skills (e.g. team work, communication, leadership).
- Exclude general concepts (e.g. Software Engineering, OOP). Focus on specific tech tools, languages, and frameworks.
- Clean and normalize them (e.g. "React.js" -> "React", "Node.js" -> "Node.js").
- Return ONLY a valid JSON list of strings representing the skills. Do not include any other text, notes, explanation, or markdown formatting (such as ```json).

RESUME / PROFILE CONTENT:
{text}
"""

    groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    if not groq_model.startswith("groq/"):
        groq_model = f"groq/{groq_model}"

    for attempt in range(retries):
        try:
            response = completion(
                model=groq_model,
                messages=[
                    {"role": "system", "content": "You are a professional assistant that outputs strictly valid JSON arrays of strings. Never output markdown format or extra text."},
                    {"role": "user", "content": prompt}
                ],
                api_key=api_key,
                temperature=0.1,
                max_tokens=800,
            )
            content = response.choices[0].message.content.strip()
            
            # Strip markdown fences
            if content.startswith("```"):
                content = content.replace("```json", "").replace("```", "").strip()
                
            data = json.loads(content)
            
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                # If LLM returned {"skills": [...]} or similar
                for val in data.values():
                    if isinstance(val, list):
                        return val
            return []
        except Exception as e:
            if "429" in str(e) or "rate_limit_exceeded" in str(e):
                sleep_time = (attempt + 1) * 5
                print(f"[ExtractSkills] Rate Limit. Retrying in {sleep_time}s... ({attempt+1}/{retries})", file=sys.stderr)
                time.sleep(sleep_time)
            else:
                print(f"[ExtractSkills] Error calling LLM: {e}", file=sys.stderr)
                time.sleep(2)
                
    return []

if __name__ == "__main__":
    # Read resume content from standard input
    input_text = sys.stdin.read().strip()
    if not input_text:
        print(json.dumps([]))
        sys.exit(0)
        
    skills = extract_skills(input_text)
    # Output to stdout as valid JSON
    print(json.dumps(skills))
