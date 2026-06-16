from crewai import Task
from agents import data_gatherer, cv_writer


def build_tasks(github_username: str, leetcode_username: str, linkedin_url: str, resume_path: str, github_repos_data: str):
    """
    Constructs and returns the sequential task list for the CV generation crew.
    """

    # ------------------------------------------------------------------ #
    #  Task 1 – Data Gathering
    # ------------------------------------------------------------------ #
    gather_task = Task(
        description=(
            f"Use your tools to gather ALL available data for this user:\n"
            f"  - GitHub username: {github_username}\n"
            f"  - LeetCode username: {leetcode_username}\n"
            f"  - LinkedIn URL: {linkedin_url}\n"
            f"  - Resume PDF path: {resume_path}\n\n"
            "Call each tool separately and return ALL raw output concatenated together. "
            "Do NOT summarize, skip, or paraphrase any data. The more detail, the better."
        ),
        expected_output=(
            "A large, detailed block of raw text containing the full output from "
            "all data sources: GitHub profile, LeetCode stats, LinkedIn profile, and the resume text. "
            "No information should be omitted."
        ),
        agent=data_gatherer,
    )

    # ------------------------------------------------------------------ #
    #  Task 2 – CV Writing
    # ------------------------------------------------------------------ #
    write_cv_task = Task(
        description=(
            "You have been given raw profile data from multiple sources. "
            "Using ALL of this information, create a comprehensive, professional, "
            "ATS-optimised CV strictly in LaTeX format.\n\n"
            f"Here is the ranked and evaluated list of the candidate's GitHub repositories:\n"
            f"{github_repos_data}\n\n"
            "The CV must include these sections:\n"
            "1. **Header** – Name, Location, GitHub, and LeetCode links (only if LeetCode is not 'none')\n"
            "2. **Professional Summary** – 3-4 sentence summary of the candidate\n"
            "3. **Technical Skills** – Grouped by category (Languages, Frameworks, Tools, etc.)\n"
            "4. **Work Experience** – From Resume, formatted as itemized bullet points\n"
            "5. **Projects** – Include all 'production-grade' repos from the provided list. "
            "Include 'solid-learning-project' repos only if there is space remaining after "
            "production-grade ones, prioritizing those with the most relevant tech stack to "
            "the user's target roles. Never include 'trivial-or-tutorial' repos. Still enforce "
            "the one-page constraint — but let project count be a natural consequence of "
            "available space and quality count, not a fixed number.\n"
            f"6. **Competitive Programming** – LeetCode stats and achievements (only if LeetCode username is not 'none', which is: {leetcode_username})\n"
            "7. **Education** – From Resume\n"
            "8. **Certifications & Awards** – Any badges, certifications found\n\n"
            "Rules:\n"
            "- Start with \\documentclass{article} and use standard packages (geometry, hyperref, enumitem, calc)\n"
            "- DO NOT use fontspec, \\setmainfont, or any custom system fonts. Use standard LaTeX fonts only.\n"
            "- DO NOT use fontawesome icons or undefined macros (e.g., \\faGithub, \\faLinkedin, \\email). Strictly use plain text for labels.\n"
            "- Enclose content in \\begin{document} and \\end{document}\n"
            "- Ensure all LaTeX special characters (e.g., %, $, &, _, #) are properly escaped\n"
            "- Use strong action verbs and quantify achievements\n"
            "- Do NOT include any markdown blocks around the LaTeX code, output ONLY the LaTeX string."
        ),
        expected_output=(
            "A complete, professional CV document written entirely in structural LaTeX code. "
            "Must start with \\documentclass and end with \\end{document}."
        ),
        agent=cv_writer,
        context=[gather_task],  # Receives output from gather_task
    )

    return [gather_task, write_cv_task]
