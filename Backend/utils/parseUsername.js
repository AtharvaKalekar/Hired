/**
 * Parses a GitHub username from a raw input string or a full GitHub profile URL.
 */
function parseUsername(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let cleaned = input.trim();

  // Regex to extract the first path component after github.com
  const regex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s?#]+)/i;
  const match = cleaned.match(regex);

  if (match && match[1]) {
    return match[1];
  }

  // Strip leading and trailing slashes if present
  cleaned = cleaned.replace(/^\/+|\/+$/g, '');

  return cleaned;
}

module.exports = parseUsername;
