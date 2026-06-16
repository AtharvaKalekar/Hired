import os
import sys
import json

def evaluate_github_repos_from_json(pref_data: dict) -> str:
    """
    Formats the pre-analyzed repository details from JavaScript Groq analysis directly
    for consumption by the CrewAI CV writer agent.
    """
    projects_list = pref_data.get("projects", [])
    
    # Format output for the CV writing step
    output_lines = []
    output_lines.append("=== RANKED HIGH-QUALITY GITHUB REPOSITORIES ===")
    
    if not projects_list:
        output_lines.append("No production-grade or solid-learning repositories found.")
        return "\n".join(output_lines)
        
    for idx, r in enumerate(projects_list, 1):
        stack_str = ", ".join(r.get("technologiesUsed", []))
        output_lines.append(f"{idx}. Project: {r['name']}")
        output_lines.append(f"   Tier: {r.get('projectCategory', 'solid-learning-project')}")
        output_lines.append(f"   Description: {r.get('description', '')}")
        output_lines.append(f"   Tech Stack: {stack_str if stack_str else 'N/A'}")
        output_lines.append(f"   Standout Technical Aspect: {r.get('resumeBullet', 'N/A')}")
        output_lines.append("")
        
    result_str = "\n".join(output_lines).strip()
    return result_str


def evaluate_github_repos(username: str) -> str:
    """
    Renders pre-fetched GitHub repositories info.
    Relying strictly on the JavaScript scraper for GitHub crawling.
    """
    pref_path = os.getenv("GITHUB_PREFETCHED_DATA_PATH", "")
    if pref_path and os.path.exists(pref_path):
        print(f"[GitHubPipeline] Loading pre-fetched analysis from {pref_path}", file=sys.stderr)
        try:
            with open(pref_path, "r", encoding="utf-8") as f:
                pref_data = json.load(f)
            return evaluate_github_repos_from_json(pref_data)
        except Exception as e:
            print(f"[GitHubPipeline] Error loading pre-fetched JSON: {e}", file=sys.stderr)
            
    return "=== RANKED HIGH-QUALITY GITHUB REPOSITORIES ===\nGitHub pre-fetched data not available. Skipping GitHub portfolio analysis."
