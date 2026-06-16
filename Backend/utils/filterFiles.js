/**
 * Filters and ranks files from a GitHub repository file tree to select the most
 * representative code files for AI analysis.
 */
function filterFiles(tree, maxFiles = 5) {
  if (!Array.isArray(tree)) {
    return [];
  }

  // Folders to completely skip
  const skippedDirs = new Set([
    'node_modules',
    'vendor',
    'dist',
    'build',
    '.git',
    '__pycache__',
    '.next',
    'coverage'
  ]);

  // Binary/lock extensions to completely skip
  const skippedExtensions = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', 
    '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.webm', 
    '.zip', '.tar', '.gz', '.rar', '.pdf', '.lock', 
    '.db', '.sqlite', '.exe', '.dll', '.so', '.dylib'
  ]);

  // Preferred extensions for code analysis
  const preferredExtensions = new Set([
    '.js', '.ts', '.py', '.go', '.rs', '.c', 
    '.cpp', '.h', '.hpp', '.java', '.rb', '.jsx', 
    '.tsx', '.vue', '.php', '.cs', '.sh', '.kt', 
    '.swift', '.scala', '.ex', '.exs', '.clj', '.hlsl',
    '.glsl', '.ml', '.mli', '.fs', '.fsi'
  ]);

  const filtered = tree.filter(entry => {
    // 1. Only actual files (blobs)
    if (entry.type !== 'blob') {
      return false;
    }

    // 2. Skip files larger than 50KB (51,200 bytes)
    const size = entry.size || 0;
    if (size > 50000) {
      return false;
    }

    // 3. Skip blacklisted folders
    const pathParts = entry.path.toLowerCase().split('/');
    const hasSkippedDir = pathParts.some(part => skippedDirs.has(part));
    if (hasSkippedDir) {
      return false;
    }

    // 4. Skip binary/lock extensions
    const lowercasePath = entry.path.toLowerCase();
    const extMatch = lowercasePath.match(/(\.[a-z0-9]+)$/);
    if (extMatch) {
      const ext = extMatch[1];
      if (skippedExtensions.has(ext)) {
        return false;
      }
    }

    return true;
  });

  // Now, score the files to rank them
  const scoredFiles = filtered.map(entry => {
    let score = 0;
    const path = entry.path;
    const lowercasePath = path.toLowerCase();
    const pathParts = path.split('/');

    // Check directory preference: root or src/
    const isInRoot = pathParts.length === 1;
    const isInSrc = pathParts[0].toLowerCase() === 'src';

    if (isInRoot) {
      score += 5;
    } else if (isInSrc) {
      score += 5;
    } else if (pathParts.some(p => p.toLowerCase() === 'lib' || p.toLowerCase() === 'app')) {
      score += 3;
    }

    // Check extension preference
    const extMatch = lowercasePath.match(/(\.[a-z0-9]+)$/);
    if (extMatch) {
      const ext = extMatch[1];
      if (preferredExtensions.has(ext)) {
        score += 10;
      } else if (['.json', '.md', '.html', '.css', '.yaml', '.yml', '.txt'].includes(ext)) {
        score += 2;
      }
    }

    // Give a slight bonus for shorter paths (prefer standard entry points/top-level modules)
    score += Math.max(0, 5 - pathParts.length);

    return {
      entry,
      score
    };
  });

  // Sort by score descending, then slice
  scoredFiles.sort((a, b) => b.score - a.score);

  return scoredFiles.slice(0, maxFiles).map(item => item.entry);
}

module.exports = filterFiles;
