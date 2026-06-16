/**
 * Shapes AI + GitHub data into a stable contract.
 * Adapted from Git hub scrapper copy.
 */

function clampScore(score) {
  const n = Number(score);
  if (Number.isNaN(n)) return 70;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function normalizeProject(project) {
  if (!project || !project.name) return null;

  return {
    name: project.name,
    url: project.url || '',
    stars: project.stars ?? 0,
    language: project.language || '',
    description: project.description || '',
    technologiesUsed: project.technologiesUsed || [],
    demonstratedSkills: project.demonstratedSkills || [],
    suitableJobTitles: project.suitableJobTitles || [],
    resumeBullet: project.resumeBullet || '',
    relevanceScore: clampScore(project.relevanceScore),
    projectCategory: project.projectCategory || 'Software Project',
  };
}

function buildJobMatchResponse(aiReport, profile, stats) {
  const projects = (aiReport.projectJobFit || aiReport.notableProjects || [])
    .map(normalizeProject)
    .filter(Boolean)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  const jobMatch = {
    candidateSummary: aiReport.candidateSummary || aiReport.summary || '',
    careerHeadline: aiReport.careerHeadline || '',
    recommendedJobTitles: aiReport.recommendedJobTitles || [],
    skillLevel: aiReport.skillLevel || 'Mid-level',
    estimatedExperience: aiReport.estimatedExperience || '',
    primaryLanguages: aiReport.primaryLanguages || [],
    techStack: aiReport.techStack || [],
    atsKeywords: aiReport.atsKeywords || [],
    focusAreas: aiReport.focusAreas || [],
    strengths: aiReport.strengths || [],
    industries: aiReport.industries || [],
    workStyle: aiReport.workStyle || '',
    portfolioPitch: aiReport.portfolioPitch || aiReport.developerPersona || '',
    interviewTalkingPoints: aiReport.interviewTalkingPoints || [],
    skillGapsToAddress: aiReport.skillGapsToAddress || [],
    jobSearchTips: aiReport.jobSearchTips || [],
  };

  const candidate = {
    username: profile.username,
    name: profile.name,
    bio: profile.bio,
    location: profile.location,
    company: profile.company,
    followers: profile.followers,
    avatarUrl: profile.avatarUrl,
    profileUrl: profile.profileUrl,
    publicRepos: profile.publicRepos,
    githubCreatedAt: profile.createdAt,
  };

  const report = {
    ...jobMatch,
    summary: jobMatch.candidateSummary,
    developerPersona: jobMatch.portfolioPitch,
    projectTypes: aiReport.projectTypes || [],
    openSourceContributor: aiReport.openSourceContributor ?? true,
    notableProjects: projects,
    ...candidate,
  };

  return {
    candidate,
    jobMatch,
    projects,
    report,
    stats,
  };
}

module.exports = {
  buildJobMatchResponse,
  normalizeProject,
};
