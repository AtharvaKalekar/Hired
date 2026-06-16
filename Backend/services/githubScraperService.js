const filterFiles = require('../utils/filterFiles');

// Helper to decode Base64 strings, removing any internal newlines first
function decodeBase64(content) {
  if (!content) return '';
  const cleaned = content.replace(/\r?\n|\r/g, '');
  return Buffer.from(cleaned, 'base64').toString('utf-8');
}

/**
 * Creates headers for GitHub REST API requests.
 */
function getHeaders() {
  const headers = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "GitHub-Developer-Profile-Analyzer"
  };

  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

/**
 * Throws structured errors based on GitHub API response.
 */
async function handleGitError(res) {
  const headers = res.headers;
  const remaining = headers.get('x-ratelimit-remaining');

  if (res.status === 404) {
    const err = new Error('GitHub user not found');
    err.code = 'USER_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  if (res.status === 403 && remaining === '0') {
    const err = new Error('GitHub rate limit exceeded. Please configure a GITHUB_TOKEN for higher limits.');
    err.code = 'RATE_LIMITED';
    err.status = 403;
    throw err;
  }

  // Any other non-OK status
  let message = 'GitHub API error';
  try {
    const data = await res.json();
    message = data.message || message;
  } catch (e) {
    // Ignore body parsing failure
  }

  const err = new Error(message);
  err.code = 'GITHUB_ERROR';
  err.status = res.status;
  throw err;
}

/**
 * Fetches user profile from GitHub.
 */
async function fetchUserProfile(username) {
  const headers = getHeaders();
  const url = `https://api.github.com/users/${encodeURIComponent(username)}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    await handleGitError(res);
  }

  const data = await res.json();
  return {
    username: data.login,
    name: data.name || data.login,
    bio: data.bio || '',
    location: data.location || '',
    company: data.company || '',
    publicRepos: data.public_repos,
    followers: data.followers,
    createdAt: data.created_at,
    avatarUrl: data.avatar_url,
    profileUrl: data.html_url
  };
}

/**
 * Fetches and aggregates complete data for a user's repositories.
 */
async function fetchUserRepoDetails(username, options = {}) {
  const maxRepos = options.maxRepos || 10;
  const includeCode = options.includeCode !== false;
  const maxFilesPerRepo = options.maxFilesPerRepo || 5;

  const headers = getHeaders();

  // 1. Fetch user repos (up to 100, page 1)
  const reposUrl = `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100&type=owner`;
  const res = await fetch(reposUrl, { headers });
  if (!res.ok) {
    await handleGitError(res);
  }

  const allRepos = await res.json();

  // Filter out forks (only original work)
  const originalRepos = allRepos.filter(repo => !repo.fork);

  if (originalRepos.length === 0) {
    const err = new Error('No public, non-forked repositories found for this user.');
    err.code = 'NO_REPOS';
    err.status = 404;
    throw err;
  }

  // Sort by stargazers_count descending
  originalRepos.sort((a, b) => b.stargazers_count - a.stargazers_count);

  // Take top maxRepos
  const selectedRepos = originalRepos.slice(0, maxRepos);
  let totalFilesRead = 0;

  // 2. Fetch repo details in parallel
  const repoDetails = await Promise.all(selectedRepos.map(async (repo) => {
    const owner = repo.owner.login;
    const repoName = repo.name;

    let readme = '';
    let languages = {};
    let tree = [];

    // Parallel fetch within each repo for README, Languages breakdown, and Git file tree
    const [readmeRes, languagesRes, treeRes] = await Promise.allSettled([
      fetch(`https://api.github.com/repos/${owner}/${repoName}/readme`, { headers }),
      fetch(`https://api.github.com/repos/${owner}/${repoName}/languages`, { headers }),
      fetch(`https://api.github.com/repos/${owner}/${repoName}/git/trees/HEAD?recursive=1`, { headers })
    ]);

    // Handle README
    if (readmeRes.status === 'fulfilled' && readmeRes.value.ok) {
      try {
        const readmeData = await readmeRes.value.json();
        if (readmeData.content) {
          readme = decodeBase64(readmeData.content).substring(0, 1500);
        }
      } catch (err) {
        // Skip readme content gracefully if parsing issues occur
      }
    }

    // Handle languages
    if (languagesRes.status === 'fulfilled' && languagesRes.value.ok) {
      try {
        languages = await languagesRes.value.json();
      } catch (err) {
        // Skip languages gracefully
      }
    }

    // Handle file tree
    if (treeRes.status === 'fulfilled' && treeRes.value.ok) {
      try {
        const treeData = await treeRes.value.json();
        if (Array.isArray(treeData.tree)) {
          tree = treeData.tree;
        }
      } catch (err) {
        // Skip tree gracefully
      }
    }

    // Filter and pick representative code files
    const selectedFiles = filterFiles(tree, maxFilesPerRepo);
    let filesContent = [];
    let filesReadCount = 0;

    // Read selected code files in parallel
    if (includeCode && selectedFiles.length > 0) {
      const fileFetches = await Promise.allSettled(
        selectedFiles.map(file => {
          const fileUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${encodeURIComponent(file.path)}`;
          return fetch(fileUrl, { headers });
        })
      );

      const resolvedFiles = await Promise.all(fileFetches.map(async (fileResult, idx) => {
        if (fileResult.status === 'fulfilled' && fileResult.value.ok) {
          try {
            const fileData = await fileResult.value.json();
            if (fileData.content) {
              const decoded = decodeBase64(fileData.content).substring(0, 1000);
              filesReadCount++;
              return {
                path: selectedFiles[idx].path,
                content: decoded
              };
            }
          } catch (e) {
            // Skip individual file gracefully on JSON parse error
          }
        }
        return null;
      }));

      filesContent = resolvedFiles.filter(Boolean);
      totalFilesRead += filesReadCount;
    }

    return {
      name: repoName,
      description: repo.description || '',
      stars: repo.stargazers_count,
      language: repo.language || '',
      url: repo.html_url,
      readme,
      languages,
      files: filesContent
    };
  }));

  // 3. Aggregate language statistics
  const totalLanguages = {};
  let totalBytes = 0;

  repoDetails.forEach(repo => {
    Object.entries(repo.languages).forEach(([lang, bytes]) => {
      if (typeof bytes === 'number') {
        totalLanguages[lang] = (totalLanguages[lang] || 0) + bytes;
        totalBytes += bytes;
      }
    });
  });

  let primaryLanguages = [];
  if (totalBytes > 0) {
    primaryLanguages = Object.entries(totalLanguages).map(([name, bytes]) => {
      return {
        name,
        percentage: Math.round((bytes / totalBytes) * 100)
      };
    });

    // Sort descending and keep top 6
    primaryLanguages.sort((a, b) => b.percentage - a.percentage);
    primaryLanguages = primaryLanguages.slice(0, 6);
  }

  return {
    repos: repoDetails,
    primaryLanguages,
    stats: {
      totalPublicRepos: originalRepos.length,
      reposAnalyzed: repoDetails.length,
      filesRead: totalFilesRead
    }
  };
}

module.exports = {
  fetchUserProfile,
  fetchUserRepoDetails
};
