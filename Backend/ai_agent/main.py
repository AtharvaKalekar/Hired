import os
import sys
import json
from datetime import datetime
from dotenv import load_dotenv
from crewai import Crew, Process

# Monkey-patch crewai to strip 'cache_breakpoint' property which Groq does not support
import crewai.llms.cache as _crewai_cache
_crewai_cache.mark_cache_breakpoint = lambda msg: msg

import litellm
litellm.num_retries = 10

# Load environment variables from .env in this directory
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from agents import data_gatherer, cv_writer
from tasks import build_tasks
from tools.github_quality_pipeline import evaluate_github_repos
from tools.latex_sanitizer import sanitize_latex_document
from extract_skills import extract_skills
from tools.github_tool import get_github_profile
from tools.leetcode_tool import get_leetcode_profile
from tools.resume_tool import parse_resume
from tools.linkedin_tool import get_linkedin_profile


def run(github_username: str, leetcode_username: str, linkedin_url: str, resume_path: str) -> dict:
    """
    Orchestrates the full CV generation pipeline.
    Returns a dict with the final CV string and a metadata object.
    """
    print("\n" + "=" * 60)
    print("  HIRED — AI CV Generator")
    print("=" * 60)
    print(f"  GitHub:   {github_username}")
    print(f"  LeetCode: {leetcode_username}")
    print(f"  LinkedIn: {linkedin_url}")
    print(f"  Resume:   {resume_path}")
    print("=" * 60 + "\n")

    # Gather raw text data programmatically to store in the DB
    github_profile_data = ""
    if github_username and github_username.lower() != "none":
        try:
            if hasattr(get_github_profile, "func") and get_github_profile.func:
                github_profile_data = get_github_profile.func(github_username)
            else:
                github_profile_data = get_github_profile.run(github_username)
        except Exception as e:
            github_profile_data = f"Error fetching GitHub profile: {e}"

    leetcode_profile_data = ""
    if leetcode_username and leetcode_username.lower() != "none":
        try:
            if hasattr(get_leetcode_profile, "func") and get_leetcode_profile.func:
                leetcode_profile_data = get_leetcode_profile.func(leetcode_username)
            else:
                leetcode_profile_data = get_leetcode_profile.run(leetcode_username)
        except Exception as e:
            leetcode_profile_data = f"Error fetching LeetCode profile: {e}"

    resume_text_data = ""
    if resume_path and resume_path.lower() != "none":
        try:
            if hasattr(parse_resume, "func") and parse_resume.func:
                resume_text_data = parse_resume.func(resume_path)
            else:
                resume_text_data = parse_resume.run(resume_path)
        except Exception as e:
            resume_text_data = f"Error parsing resume: {e}"

    linkedin_profile_data = ""
    if linkedin_url and linkedin_url.lower() != "none":
        try:
            if hasattr(get_linkedin_profile, "func") and get_linkedin_profile.func:
                linkedin_profile_data = get_linkedin_profile.func(linkedin_url)
            else:
                linkedin_profile_data = get_linkedin_profile.run(linkedin_url)
        except Exception as e:
            linkedin_profile_data = f"Error fetching LinkedIn profile: {e}"

    # Run GitHub quality evaluation pipeline first
    if github_username and github_username.lower() != "none":
        github_repos_data = evaluate_github_repos(github_username)
    else:
        github_repos_data = "No GitHub repositories provided."

    tasks = build_tasks(github_username, leetcode_username, linkedin_url, resume_path, github_repos_data)

    import time
    result = None
    for attempt in range(5):
        try:
            crew = Crew(
                agents=[data_gatherer, cv_writer],
                tasks=tasks,
                process=Process.sequential,  # Run tasks one after the other
                verbose=True,
                memory=False,                # Completely disable crew memory to prevent token-heavy summaries
            )
            result = crew.kickoff()
            break
        except Exception as e:
            if "rate_limit" in str(e).lower() or "429" in str(e):
                print(f"[main.py] Groq Rate limit hit during CrewAI kickoff. Retrying in 12s... ({attempt+1}/5)", file=sys.stderr)
                time.sleep(12)
            else:
                raise e

    if result is None:
        raise RuntimeError("Failed to complete CrewAI CV generation due to persistent rate limits.")
    cv_text = str(result)

    # Deterministic LaTeX special character escaping post-processor
    cv_text = sanitize_latex_document(cv_text)

    # Extract open-ended skills from the final generated LaTeX
    extracted_skills = extract_skills(cv_text)

    # Save output to a timestamped LaTeX file
    output_dir = os.path.join(os.path.dirname(__file__), "output")
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_filename = f"cv_{github_username}_{timestamp}.tex"
    output_path = os.path.join(output_dir, output_filename)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(cv_text)

    print(f"\n✅ CV saved to: {output_path}")

    return {
        "status": "success",
        "cv_latex": cv_text,
        "output_file": output_path,
        "generated_at": timestamp,
        "skills": extracted_skills,
        "github_data": github_profile_data,
        "leetcode_data": leetcode_profile_data,
        "resume_data": resume_text_data,
        "linkedin_data": linkedin_profile_data,
        "github_repos_data": github_repos_data
    }


if __name__ == "__main__":
    """
    CLI usage:
      python main.py <github_user> <leetcode_user> <linkedin_url> <resume_pdf_path>

    Example:
      python main.py atharvakalekar atharva https://linkedin.com/in/atharvakalekar ./resume.pdf
    """
    if len(sys.argv) != 5:
        print(
            "Usage: python main.py <github_username> <leetcode_username> <linkedin_url> <resume_pdf_path>"
        )
        sys.exit(1)

    github_user = sys.argv[1]
    leetcode_user = sys.argv[2]
    linkedin = sys.argv[3]
    resume = sys.argv[4]

    output = run(github_user, leetcode_user, linkedin, resume)

    # Also print a JSON summary for the Node.js backend to parse via stdout
    print("\n--- JSON OUTPUT ---")
    print(json.dumps({
        "status": output["status"], 
        "output_file": output["output_file"],
        "skills": output.get("skills", []),
        "github_data": output.get("github_data", ""),
        "leetcode_data": output.get("leetcode_data", ""),
        "resume_data": output.get("resume_data", ""),
        "linkedin_data": output.get("linkedin_data", ""),
        "github_repos_data": output.get("github_repos_data", "")
    }))

