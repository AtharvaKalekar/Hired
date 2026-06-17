"""
tailor_resume.py — Targeted Resume & Cover Letter Generator

Takes a JSON file path containing the user's master CV and job details,
then uses Groq LLM (via litellm) to rewrite the CV to maximally align with the role.

Usage:
  python tailor_resume.py <input_json_file_path>

The JSON file must contain: master_cv, job_title, company, job_description

Outputs JSON to stdout with keys: tailored_cv, cover_letter
"""

import os
import sys
import json
import time
from dotenv import load_dotenv

# Load env from the ai_agent directory
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

def call_groq(prompt: str, retries: int = 3) -> str:
    """Call Groq via litellm (same library CrewAI uses, proven to work) with aggressive Rate Limit retries."""
    from litellm import completion

    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        raise ValueError("GROQ_API_KEY not set in environment or .env")

    groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    if not groq_model.startswith("groq/"):
        groq_model = f"groq/{groq_model}"

    for attempt in range(retries):
        try:
            response = completion(
                model=groq_model,
                messages=[
                    {"role": "system", "content": "You are a world-class technical resume writer and career strategist."},
                    {"role": "user", "content": prompt}
                ],
                api_key=api_key,
                temperature=0.4,
                max_tokens=4096,
            )
            return response.choices[0].message.content
        except Exception as e:
            if "429" in str(e) or "rate_limit_exceeded" in str(e):
                if attempt < retries - 1:
                    print(f"[TailorEngine] GROQ Rate Limit Hit! Sleeping for 5 seconds before retry {attempt+1}/{retries}...", file=sys.stderr)
                    time.sleep(5)
                else:
                    raise e
            else:
                raise e
    return ""


def tailor_cv(master_cv: str, job_title: str, company: str, job_description: str) -> dict:
    """
    Use the LLM to rewrite the master CV specifically for a target role.
    Returns dict with 'tailored_cv' and 'cover_letter'.
    """

    # Truncate master CV if it's extremely long to stay within context limits
    cv_for_prompt = master_cv[:6000] if len(master_cv) > 6000 else master_cv

    # ---- Step 1: Tailor the Resume ----
    cv_prompt = f"""You are given a master LaTeX CV and a target job posting.
Rewrite the CV to maximize ATS match for this specific role.

RULES:
- Use EXACTLY the target LaTeX template format provided below. Do not deviate from its structure (e.g., \\documentclass, \\resumeSubHeadingListStart, \\resumeItem, etc.).
- Rewrite the Professional Summary and Bullet Points to specifically target the keywords in the target job.
- Reorder the Technical Skills section to put the most relevant skills FIRST.
- Keep it truthful — enhance framing, don't fabricate experience.
- IT IS CRITICAL THAT THE RESUME DOES NOT EXCEED ONE PAGE. Let the number of projects included be a natural consequence of available space and quality, not a hardcoded number. Prioritize including the most relevant projects first.
- Output ONLY the LaTeX code, nothing else.
- CRITICAL: If you write ampersands (&) or percent signs (%) in the text, you MUST escape them as \\& and \\%. Do NOT escape ampersands inside structural alignments like \\begin{{tabular}}.
- CRITICAL: DO NOT escape plus signs (+). Write C++ exactly as C++, never as C\\+\\+. 
- Ensure all packages from the target template are maintained.

TARGET JOB:
  Title: {job_title}
  Company: {company}
  Description: {job_description[:2000]}

CANDIDATE EXISTING INFO:
{cv_for_prompt}

TARGET LATEX TEMPLATE SKELETON (You MUST follow this exact structure and macro usage!):
\\documentclass[letterpaper,11pt]{{article}}
\\usepackage{{latexsym}}
\\usepackage[empty]{{fullpage}}
\\usepackage{{titlesec}}
\\usepackage{{marvosym}}
\\usepackage[usenames,dvipsnames]{{color}}
\\usepackage{{verbatim}}
\\usepackage{{enumitem}}
\\usepackage[hidelinks]{{hyperref}}
\\usepackage{{fancyhdr}}
\\usepackage[english]{{babel}}
\\usepackage{{tabularx}}
\\usepackage{{fontawesome5}}
\\usepackage[scale=0.90,lf]{{FiraMono}}

\\definecolor{{light-grey}}{{gray}}{{0.83}}
\\definecolor{{dark-grey}}{{gray}}{{0.3}}
\\definecolor{{text-grey}}{{gray}}{{.08}}
\\DeclareRobustCommand{{\\ebseries}}{{\\fontseries{{eb}}\\selectfont}}
\\DeclareTextFontCommand{{\\texteb}}{{\\ebseries}}
\\usepackage{{contour}}
\\usepackage[normalem]{{ulem}}
\\renewcommand{{\\ULdepth}}{{1.8pt}}
\\contourlength{{0.8pt}}
\\newcommand{{\\myuline}}[1]{{%
  \\uline{{\\phantom{{#1}}}}%
  \\llap{{\\contour{{white}}{{#1}}}}%
}}
\\usepackage{{tgheros}}
\\renewcommand*\\familydefault{{\\sfdefault}} 
\\usepackage[T1]{{fontenc}}

\\pagestyle{{fancy}}
\\fancyhf{{}}
\\fancyfoot{{}}
\\renewcommand{{\\headrulewidth}}{{0pt}}
\\renewcommand{{\\footrulewidth}}{{0pt}}

\\addtolength{{\\oddsidemargin}}{{-0.5in}}
\\addtolength{{\\evensidemargin}}{{0in}}
\\addtolength{{\\textwidth}}{{1in}}
\\addtolength{{\\topmargin}}{{-.5in}}
\\addtolength{{\\textheight}}{{1.0in}}
\\urlstyle{{same}}
\\raggedbottom
\\raggedright
\\setlength{{\\tabcolsep}}{{0in}}

\\titleformat {{\\section}}{{
    \\bfseries \\vspace{{2pt}} \\raggedright \\large
}}{{}}{{0em}}{{}}[\\color{{light-grey}} {{\\titlerule[2pt]}} \\vspace{{-4pt}}]

\\newcommand{{\\resumeItem}}[1]{{
  \\item\\small{{
    {{#1 \\vspace{{-1pt}}}}
  }}
}}
\\newcommand{{\\resumeSubheading}}[4]{{
  \\vspace{{-1pt}}\\item
    \\begin{{tabular*}}{{\\textwidth}}[t]{{l@{{\\extracolsep{{\\fill}}}}r}}
      \\textbf{{#1}} & {{\\color{{dark-grey}}\\small #2}}\\vspace{{1pt}}\\\\
      \\textit{{#3}} & {{\\color{{dark-grey}} \\small #4}}\\\\
    \\end{{tabular*}}\\vspace{{-4pt}}
}}
\\newcommand{{\\resumeSubSubheading}}[2]{{
    \\item
    \\begin{{tabular*}}{{\\textwidth}}{{l@{{\\extracolsep{{\\fill}}}}r}}
      \\textit{{\\small#1}} & \\textit{{\\small #2}} \\\\
    \\end{{tabular*}}\\vspace{{-7pt}}
}}
\\newcommand{{\\resumeProjectHeading}}[2]{{
    \\item
    \\begin{{tabular*}}{{\\textwidth}}{{l@{{\\extracolsep{{\\fill}}}}r}}
      #1 & {{\\color{{dark-grey}}}} \\\\
    \\end{{tabular*}}\\vspace{{-4pt}}
}}
\\newcommand{{\\resumeSubItem}}[1]{{\\resumeItem{{#1}}\\vspace{{-4pt}}}}
\\renewcommand\\labelitemii{{$\\vcenter{{\\hbox{{\\tiny$\\bullet$}}}}$}}
\\newcommand{{\\resumeSubHeadingListStart}}{{\\begin{{itemize}}[leftmargin=0in, label={{}}]}}
\\newcommand{{\\resumeSubHeadingListEnd}}{{\\end{{itemize}}}}
\\newcommand{{\\resumeItemListStart}}{{\\begin{{itemize}}}}
\\newcommand{{\\resumeItemListEnd}}{{\\end{{itemize}}\\vspace{{0pt}}}}

\\color{{text-grey}}

\\begin{{document}}

\\begin{{center}}
    {{\\LARGE \\textbf{{[Candidate Name]}}}}\\\\[2mm]
    [Location] \\\\
    \\href{{mailto:[email]}}{{[email]}} \\quad | \\quad
    [Phone] \\quad | \\quad
    \\href{{[linkedin]}}{{[linkedin domain]}} \\quad | \\quad
    \\href{{[github]}}{{[github domain]}}
\\end{{center}}

\\section{{PROFESSIONAL SUMMARY}}
[1 paragraph summary perfectly matching the job]

\\section{{EXPERIENCE}}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {{[Job Title]}}{{[Start Date] -- [End Date]}}
      {{[Company Name]}}{{[Location]}}
      \\resumeItemListStart
        \\resumeItem{{[Bullet point 1 highlighting achievements]}}
        \\resumeItem{{[Bullet point 2 highlighting achievements]}}
      \\resumeItemListEnd
  \\resumeSubHeadingListEnd

\\section{{PROJECTS}}
    \\resumeSubHeadingListStart
      \\resumeProjectHeading
          {{\\textbf{{[Project Name]}}}} {{[Date]}}
          \\resumeItemListStart
            \\resumeItem{{[Bullet point 1]}}
            \\resumeItem{{[Bullet point 2]}}
          \\resumeItemListEnd
    \\resumeSubHeadingListEnd

\\section{{EDUCATION}}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {{[University Name]}}{{[Dates]}}
      {{[Degree]}}{{[Location]}}
      \\resumeItemListStart
        \\resumeItem {{\\textbf{{Coursework}}: [relevant courses]}}
      \\resumeItemListEnd
  \\resumeSubHeadingListEnd

\\section{{SKILLS}}
 \\begin{{itemize}}[leftmargin=0in, label={{}}]
    \\small{{\\item{{
     \\textbf{{Languages}} {{: [Comma separated languages e.g. Python, Java, JavaScript, C++]}}\\vspace{{2pt}} \\\\
     \\textbf{{Technologies}} {{: [Comma separated technologies e.g. React.js, Node.js, MongoDB]}}\\vspace{{2pt}} \\\\
     \\textbf{{Tools}}     {{: [Comma separated tools e.g. Git, Docker, Kubernetes, AWS]}}
    }}}}
 \\end{{itemize}}

\\end{{document}}

Output the complete tailored LaTeX CV now:"""

    try:
        print("[TailorEngine] Generating tailored CV...", file=sys.stderr)
        tailored_cv = call_groq(cv_prompt)
    except Exception as cv_err:
        print(f"[TailorEngine] Groq strictly denied Limit. Engaging fallback master CV... ({cv_err})", file=sys.stderr)
        tailored_cv = cv_for_prompt # Gracefully return un-tailored structure so Tectonic succeeds!

    # Clean up — aggressive markdown fence stripping
    tailored_cv = tailored_cv.strip()
    if tailored_cv.startswith("```"):
        tailored_cv = tailored_cv.replace("```latex", "").replace("```tex", "").replace("```", "").strip()

    # Deterministic LaTeX special character escaping post-processor
    from tools.latex_sanitizer import sanitize_latex_document
    tailored_cv = sanitize_latex_document(tailored_cv)

    # ---- Step 2: Generate Cover Letter ----
    cl_prompt = f"""Write a concise, professional cover letter for the following job application.
The candidate's background is summarized in their CV below.

TARGET JOB:
  Title: {job_title}
  Company: {company}
  Description: {job_description[:1500]}

CANDIDATE CV (LaTeX — extract the relevant info):
{cv_for_prompt[:2000]}

RULES:
- 3-4 paragraphs maximum
- Professional but personable tone
- Mention specific technical skills that match the job
- Express genuine interest in the company's mission
- Close with a clear call to action
- Do NOT include any LaTeX formatting — plain text only
- Do NOT include placeholder brackets like [Your Name] — use the name from the CV

Write the cover letter now:"""

    try:
        print("[TailorEngine] Generating cover letter...", file=sys.stderr)
        cover_letter = call_groq(cl_prompt)
    except Exception as cl_err:
        print(f"[TailorEngine] Groq failed Cover Letter: {cl_err}. Bypassing...", file=sys.stderr)
        cover_letter = "Dear Hiring Team,\n\nI am deeply interested in this position and believe my background makes me an excellent fit. Please find my tailored resume attached.\n\nBest Regards."

    return {
        "tailored_cv": tailored_cv,
        "cover_letter": cover_letter
    }


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python tailor_resume.py <input_json_file>", file=sys.stderr)
        sys.exit(1)

    input_file = sys.argv[1]

    try:
        with open(input_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"[TailorEngine] Failed to read input file: {e}", file=sys.stderr)
        sys.exit(1)

    master_cv = data.get("master_cv", "")
    job_title = data.get("job_title", "Software Engineer")
    company = data.get("company", "Company")
    job_desc = data.get("job_description", "")

    if not master_cv:
        print("[TailorEngine] ERROR: master_cv is empty in input file.", file=sys.stderr)
        sys.exit(1)

    try:
        print(f"[TailorEngine] Loaded input. CV length: {len(master_cv)}, Job: {job_title} at {company}", file=sys.stderr)
        result = tailor_cv(master_cv, job_title, company, job_desc)

        # Output clean JSON for the Node.js backend to parse
        print("--- TAILOR JSON OUTPUT ---")
        print(json.dumps(result))
    except Exception as general_err:
        import traceback
        err_str = traceback.format_exc()
        print(f"[TailorEngine] CRITICAL PYTHON EXCEPTION:\n{err_str}", file=sys.stderr)
        with open("/Users/atharvakalekar/Documents/Hired/Backend/python_crash.log", "w") as f:
            f.write(err_str)
        sys.exit(1)
