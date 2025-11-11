import { GitHubRepository } from '../types';

/**
 * Analyzes GitHub releases to determine if they include features and fixes
 */
export function analyzeReleaseNotesContent(repository: GitHubRepository): { hasFeats: boolean; hasFixes: boolean } {
  if (!repository.releases || repository.releases.length === 0) {
    return { hasFeats: false, hasFixes: false };
  }

  // Filter releases from the past year
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const releasesFromPastYear = repository.releases.filter(release => {
    if (!release.publishedAt) return false;
    const publishedDate = new Date(release.publishedAt);
    return publishedDate >= oneYearAgo;
  });

  let hasFeats = false;
  let hasFixes = false;

  for (const release of releasesFromPastYear) {
    if (release.description) {
      if (!hasFeats && hasFeatureContent(release.description)) {
        hasFeats = true;
      }
      if (!hasFixes && hasFixContent(release.description)) {
        hasFixes = true;
      }

      // Early exit if we found both
      if (hasFeats && hasFixes) {
        break;
      }
    }
  }

  return { hasFeats, hasFixes };
}

/**
 * Checks if release description contains feature-related content
 */
function hasFeatureContent(description: string): boolean {
  return description.toLowerCase().includes('feat');
}

/**
 * Checks if release description contains fix-related content
 */
function hasFixContent(description: string): boolean {
  return description.toLowerCase().includes('fix');
}