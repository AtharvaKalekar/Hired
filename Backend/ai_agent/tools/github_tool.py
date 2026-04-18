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
    Fetches a GitHub user's public profile details, top repositories,
    and the programming languages used across those repos.
    Returns a formatted text summary.
    """
    base = "https://api.github.com"
    headers = _headers()

    # --- User profile ---
    profile_resp = requests.get(f"{base}/users/{username}", headers=headers, timeout=10)
    if profile_resp.status_code != 200:
        return f"Error fetching GitHub profile for {username}: {profile_resp.text}"
    profile = profile_resp.json()

    # --- Repositories (sorted by stars, top 10) ---
    repos_resp = requests.get(
        f"{base}/users/{username}/repos",
        headers=headers,
        params={"sort": "stars", "per_page": 10},
        timeout=10,
    )
    repos = repos_resp.json() if repos_resp.status_code == 200 else []

    # --- Language breakdown ---
    language_counts: dict = {}
    for repo in repos:
        lang = repo.get("language")
        if lang:
            language_counts[lang] = language_counts.get(lang, 0) + 1

    top_repos = [
        f"  - {r['name']} (⭐ {r['stargazers_count']}): {r.get('description', 'No description')}"
        for r in repos
    ]

    result = f"""
=== GitHub Profile: {username} ===
Name: {profile.get('name', 'N/A')}
Bio: {profile.get('bio', 'N/A')}
Location: {profile.get('location', 'N/A')}
Public Repos: {profile.get('public_repos', 0)}
Followers: {profile.get('followers', 0)}
Following: {profile.get('following', 0)}
Blog/Website: {profile.get('blog', 'N/A')}
GitHub URL: {profile.get('html_url', 'N/A')}

--- Top Repositories ---
{chr(10).join(top_repos) if top_repos else 'No public repos found.'}

--- Languages Used ---
{', '.join([f"{l} ({c} repos)" for l, c in sorted(language_counts.items(), key=lambda x: -x[1])]) or 'N/A'}
"""
    return result.strip()
