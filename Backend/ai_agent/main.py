import os
import sys
import json
from datetime import datetime
from dotenv import load_dotenv
from crewai import Crew, Process

# Load environment variables from .env in this directory
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from agents import data_gatherer, cv_writer
from tasks import build_tasks


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

    tasks = build_tasks(github_username, leetcode_username, linkedin_url, resume_path)

    crew = Crew(
        agents=[data_gatherer, cv_writer],
        tasks=tasks,
        process=Process.sequential,  # Run tasks one after the other
        verbose=True,
    )

    result = crew.kickoff()
    cv_text = str(result)

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
    print(json.dumps({"status": output["status"], "output_file": output["output_file"]}))
