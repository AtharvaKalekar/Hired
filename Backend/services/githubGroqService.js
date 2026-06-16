/**
 * Groq AI Service for GitHub analysis.
 * Adapted from Git hub scrapper copy.
 */

const MAX_PROMPT_CHARS = 14000;
const MAX_README_CHARS = 800;
const MAX_FILE_CHARS = 500;
const MAX_REPOS_IN_PROMPT = 5;
const MAX_FILES_PER_REPO_IN_PROMPT = 2;

function compactRepoDetails(repoDetails) {
  const repos = repoDetails.slice(0, MAX_REPOS_IN_PROMPT).map((repo) => ({
    ...repo,
    readme: repo.readme ? repo.readme.substring(0, MAX_README_CHARS) : '',
    files: (repo.files || []).slice(0, MAX_FILES_PER_REPO_IN_PROMPT).map((file) => ({
      path: file.path,
      content: (file.content || '').substring(0, MAX_FILE_CHARS),
    })),
  }));

  return repos;
}

function parseRetryAfterMs(bodyText) {
  const msMatch = bodyText.match(/try again in (\d+)ms/i);
  if (msMatch) return parseInt(msMatch[1], 10) + 1500;

  const secMatch = bodyText.match(/try again in ([\d.]+)s/i);
  if (secMatch) return Math.ceil(parseFloat(secMatch[1]) * 1000) + 1500;

  return 5000;
}

function truncatePrompt(prompt) {
  if (prompt.length <= MAX_PROMPT_CHARS) return prompt;
  return `${prompt.substring(0, MAX_PROMPT_CHARS)}\n\n[Context truncated to fit API limits.]`;
}

function cleanJsonString(str) {
  if (!str) return '';
  let cleaned = str.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?/i, '').replace(/```$/i, '');
  }
  return cleaned.trim();
}

function buildPrompt(profile, repoDetails, primaryLanguages) {
  const languageList = primaryLanguages.map(l => `${l.name} (${l.percentage}%)`).join(', ');

  let reposDescription = '';
  repoDetails.forEach((repo, i) => {
    reposDescription += `\n--- Repository #${i + 1}: ${repo.name} ---\n`;
    reposDescription += `URL: ${repo.url}\n`;
    reposDescription += `Stars: ${repo.stars}\n`;
    reposDescription += `Primary Language: ${repo.language}\n`;
    reposDescription += `Description: ${repo.description}\n`;

    if (repo.readme) {
      reposDescription += `README Excerpt:\n${repo.readme}\n`;
    }

    if (repo.files && repo.files.length > 0) {
      reposDescription += `Sample Source Code Files:\n`;
      repo.files.forEach(file => {
        reposDescription += `[File: ${file.path}]\n`;
        reposDescription += `${file.content}\n\n`;
      });
    }
  });

  return `You are an expert technical recruiter and career coach. Your goal is to help this developer FIND A JOB by analyzing their GitHub work and mapping it to real job opportunities.

Developer Profile:
- Username: ${profile.username}
- Real Name: ${profile.name}
- Bio: ${profile.bio}
- Location: ${profile.location}
- Company: ${profile.company}
- Public Repos: ${profile.publicRepos}
- Followers: ${profile.followers}
- Profile Created: ${profile.createdAt}

Pre-computed Languages (by overall byte-count):
${languageList}

Repositories analyzed (with README + code samples):
${reposDescription}

Instructions:
1. Infer employable skills ONLY from evidence in repos, READMEs, and code (no guessing unrelated stacks).
2. Recommend job titles this person could realistically apply for TODAY based on their projects.
3. For EACH analyzed repository in projectJobFit, explain how it helps them get hired (skills proven, roles it supports).
4. Write resume-ready bullets (action + tech + outcome where possible).
5. Provide ATS keywords recruiters and job boards would match (tools, languages, domains).
6. relevanceScore (0-100) = how strong this project is as portfolio proof for job applications.

YOU MUST RETURN ONLY A VALID JSON OBJECT — no markdown, no text outside JSON.

JSON Schema:
{
  "candidateSummary": "2-3 sentences: who they are as a job candidate, core stack, and what roles they are ready for.",
  "careerHeadline": "One line for LinkedIn/resume headline, e.g. 'Mid-level Full Stack Developer | React, Node.js, PostgreSQL'",
  "recommendedJobTitles": ["Job Title 1", "Job Title 2", "Job Title 3", "Job Title 4", "Job Title 5"],
  "skillLevel": "One of: Junior, Mid-level, Senior, Expert, Lead",
  "estimatedExperience": "e.g. '1-2 years', '3-5 years', '5-10 years', '10+ years'",
  "primaryLanguages": [
    { "name": "LanguageName", "percentage": 70 }
  ],
  "techStack": ["Frameworks, libraries, databases, cloud, tools inferred from repos"],
  "atsKeywords": ["15-25 keywords for job matching: languages, frameworks, methodologies, domains"],
  "focusAreas": ["2-4 technical domains e.g. API Development, DevOps, Machine Learning"],
  "strengths": ["4-6 hireable strengths backed by their projects"],
  "industries": ["2-4 industries their projects fit: SaaS, FinTech, Open Source, etc."],
  "workStyle": "2 sentences on code quality, collaboration signals, documentation — relevant to employers.",
  "portfolioPitch": "2-3 sentences they could use in a cover letter or application email.",
  "interviewTalkingPoints": ["3-5 concrete stories to tell in interviews, tied to specific projects"],
  "skillGapsToAddress": ["2-4 honest gaps that might block some roles, with brief upskill suggestions"],
  "jobSearchTips": ["3-4 actionable tips: which roles to target, how to position weak repos, etc."],
  "projectTypes": ["Web App", "CLI Tool", etc.],
  "openSourceContributor": true,
  "projectJobFit": [
    {
      "name": "exact-repo-name-from-data",
      "description": "What the project does and its business/technical value.",
      "stars": 0,
      "language": "Primary language",
      "url": "https://github.com/...",
      "technologiesUsed": ["Tech1", "Tech2"],
      "demonstratedSkills": ["Skill proven by this repo"],
      "suitableJobTitles": ["Roles this project qualifies them for"],
      "resumeBullet": "One strong resume bullet: Built/Designed/Implemented X using Y, resulting in Z.",
      "relevanceScore": 85,
      "projectCategory": "Web Application | API | Mobile | Data | DevOps | Other"
    }
  ]
}

Rules:
- primaryLanguages: use pre-computed percentages; adjust slightly only if code strongly suggests otherwise. Sum ~100%.
- projectJobFit: include up to 5 repos FROM THE DATA ABOVE (use exact names/urls/stars). Sort by relevanceScore descending.
- recommendedJobTitles: prioritize titles matchable from actual projects, not aspirational roles.
- atsKeywords: mix hard skills + role keywords (e.g. "full stack", "REST API").`;
}

async function analyzeProfileWithGroq(profile, repoDetails, primaryLanguages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const err = new Error('Groq API key is not configured in backend .env');
    err.code = 'AI_ERROR';
    err.status = 500;
    throw err;
  }

  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const compactRepos = compactRepoDetails(repoDetails);
  const prompt = truncatePrompt(buildPrompt(profile, compactRepos, primaryLanguages));

  let attempts = 4;
  let lastError = null;

  while (attempts > 0) {
    try {
      console.log(`Calling Groq API for GitHub summary with model: ${model} (attempt ${5 - attempts}/4)...`);

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are a JSON-only career-matching API. Output one valid JSON object for job search and recruiting systems. No markdown, no code fences, no extra text.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4096,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const bodyText = await response.text();

        if (response.status === 429) {
          const waitMs = parseRetryAfterMs(bodyText);
          console.warn(`Groq rate limit hit. Waiting ${waitMs}ms before retry...`);
          await new Promise((r) => setTimeout(r, waitMs));
          lastError = new Error('Groq API rate limit exceeded.');
          lastError.code = 'AI_RATE_LIMITED';
          attempts--;
          continue;
        }

        const err = new Error(`Groq API request failed: ${response.status} - ${bodyText}`);
        err.code = 'AI_ERROR';
        err.status = response.status;
        throw err;
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content;

      if (!rawText) {
        throw new Error('Empty or invalid response structure from Groq API');
      }

      const cleanedText = cleanJsonString(rawText);

      try {
        const report = JSON.parse(cleanedText);
        const hasSummary = report.candidateSummary || report.summary;
        const hasProjects = Array.isArray(report.projectJobFit) || Array.isArray(report.notableProjects);
        if (!hasSummary || !Array.isArray(report.primaryLanguages) || !hasProjects) {
          throw new Error('Groq response missing required fields');
        }
        console.log('✅ JavaScript Groq GitHub analysis completed successfully');
        return report;
      } catch (parseErr) {
        console.error(`Attempt failed to parse JSON: ${parseErr.message}`);
        lastError = parseErr;
      }
    } catch (apiErr) {
      console.error(`Attempt failed during Groq API fetch: ${apiErr.message}`);
      lastError = apiErr;
    }

    attempts--;
    if (attempts > 0) {
      console.log('Retrying Groq API analysis...');
      await new Promise((r) => setTimeout(r, 2500));
    }
  }

  const error = new Error(`Groq Analysis failed: ${lastError?.message || 'Invalid JSON format'}`);
  error.code = lastError?.code === 'AI_RATE_LIMITED' ? 'AI_RATE_LIMITED' : 'AI_ERROR';
  error.status = 500;
  throw error;
}

module.exports = {
  analyzeProfileWithGroq
};
