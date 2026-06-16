import os
import requests
from crewai.tools import tool


GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")


def _headers():
    h = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        h["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return h


@tool("Fetch GitHub Profile Data")
def get_github_profile(username: str) -> str:
    """
    Fetches a GitHub user's public profile details from pre-fetched data.
    Returns a formatted text summary.
    """
    import json
    pref_path = os.getenv("GITHUB_PREFETCHED_DATA_PATH", "")
    if pref_path and os.path.exists(pref_path):
        try:
            with open(pref_path, "r", encoding="utf-8") as f:
                pref_data = json.load(f)
            candidate = pref_data.get("candidate", {})
            job_match = pref_data.get("jobMatch", {})
            result = f"""
=== GitHub Profile: {username} ===
Name: {candidate.get('name', 'N/A')}
Bio: {candidate.get('bio', 'N/A')}
Location: {candidate.get('location', 'N/A')}
Public Repos: {candidate.get('publicRepos', 0)}
Followers: {candidate.get('followers', 0)}
GitHub URL: {candidate.get('profileUrl', 'N/A')}
Career Headline: {job_match.get('careerHeadline', 'N/A')}
Summary: {job_match.get('candidateSummary', 'N/A')}
Focus Areas: {', '.join(job_match.get('focusAreas', []))}
"""
            return result.strip()
        except Exception as e:
            return f"Error reading pre-fetched GitHub profile data: {e}"
            
    return "GitHub profile data is not available. Please ensure JavaScript pre-fetching runs successfully."
