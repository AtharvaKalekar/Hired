import requests
from crewai.tools import tool


LEETCODE_GRAPHQL = "https://leetcode.com/graphql"

PROFILE_QUERY = """
query getUserProfile($username: String!) {
  matchedUser(username: $username) {
    username
    profile {
      realName
      aboutMe
      school
      countryName
      company
      jobTitle
      ranking
    }
    submitStatsGlobal {
      acSubmissionNum {
        difficulty
        count
      }
    }
    badges {
      name
    }
  }
}
"""


@tool("Fetch LeetCode Profile Data")
def get_leetcode_profile(username: str) -> str:
    """
    Fetches a LeetCode user's public profile including problems solved
    by difficulty (Easy / Medium / Hard), ranking, and badges.
    Returns a formatted text summary.
    """
    headers = {
        "Content-Type": "application/json",
        "Referer": "https://leetcode.com",
        "User-Agent": "Mozilla/5.0",
    }
    payload = {"query": PROFILE_QUERY, "variables": {"username": username}}

    try:
        resp = requests.post(LEETCODE_GRAPHQL, json=payload, headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        return f"Error fetching LeetCode profile: {e}"

    user = data.get("data", {}).get("matchedUser")
    if not user:
        return f"No LeetCode user found for username: {username}"

    profile = user.get("profile", {})
    stats = user.get("submitStatsGlobal", {}).get("acSubmissionNum", [])
    badges = [b["name"] for b in user.get("badges", [])]

    solved_map = {s["difficulty"]: s["count"] for s in stats}
    total = solved_map.get("All", 0)
    easy = solved_map.get("Easy", 0)
    medium = solved_map.get("Medium", 0)
    hard = solved_map.get("Hard", 0)

    result = f"""
=== LeetCode Profile: {username} ===
Real Name: {profile.get('realName', 'N/A')}
Company: {profile.get('company', 'N/A')}
Job Title: {profile.get('jobTitle', 'N/A')}
School: {profile.get('school', 'N/A')}
Country: {profile.get('countryName', 'N/A')}
Global Ranking: #{profile.get('ranking', 'N/A')}

--- Problems Solved ---
Total Accepted: {total}
  Easy:   {easy}
  Medium: {medium}
  Hard:   {hard}

--- Badges ---
{', '.join(badges) if badges else 'No badges'}
"""
    return result.strip()
