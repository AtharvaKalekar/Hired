import os
from crewai import Agent, LLM
from tools.github_tool import get_github_profile
from tools.leetcode_tool import get_leetcode_profile
from tools.resume_tool import parse_resume
from tools.linkedin_tool import get_linkedin_profile

# ------------------------------------------------------------------ #
#  High-Speed LLM via Groq LPU
# ------------------------------------------------------------------ #
# ------------------------------------------------------------------ #
#  High-Speed LLM via Groq LPU
# ------------------------------------------------------------------ #
groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
if not groq_model.startswith("groq/"):
    groq_model = f"groq/{groq_model}"

llm_engine = LLM(
    model=groq_model,
    api_key=os.getenv("GROQ_API_KEY", ""),
    base_url="https://api.groq.com/openai/v1",
    max_retries=10
)


# ------------------------------------------------------------------ #
#  Agent 1 – Information Gatherer
#  Responsible for hitting all external sources and pulling raw data.
# ------------------------------------------------------------------ #
data_gatherer = Agent(
    role="Information Gatherer",
    goal=(
        "Collect every piece of publicly available professional information "
        "about the user from GitHub, LeetCode, LinkedIn, and their uploaded resume."
    ),
    backstory=(
        "You are a meticulous OSINT researcher with deep expertise in developer "
        "profiles. You know exactly which data points matter for technical hiring. "
        "You always return complete, structured, raw data without summarizing or omitting anything."
    ),
    tools=[get_github_profile, get_leetcode_profile, parse_resume, get_linkedin_profile],
    llm=llm_engine,
    verbose=True,
    allow_delegation=False,
    memory=False,                     # Disable memory to avoid extra summarization calls
)

# ------------------------------------------------------------------ #
#  Agent 2 – Senior CV Writer
#  Takes raw gathered data and synthesizes it into a professional CV.
# ------------------------------------------------------------------ #
cv_writer = Agent(
    role="Senior Technical CV Writer",
    goal=(
        "Transform raw, unstructured profile data into a polished, ATS-friendly, "
        "Markdown-formatted CV that highlights the user's strongest technical skills "
        "and career achievements."
    ),
    backstory=(
        "You are a world-class technical recruiter and resume writer with 15+ years "
        "of experience at top tech companies. You know how to frame GitHub projects "
        "as impact-driven achievements, translate LeetCode stats into proof of "
        "algorithmic thinking, and align a candidate's background with what modern "
        "engineering teams are looking for. You write with precision and clarity."
    ),
    tools=[],
    llm=llm_engine,
    verbose=True,
    allow_delegation=False,
    memory=False,                     # Disable memory to avoid extra summarization calls
)
