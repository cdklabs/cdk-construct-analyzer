import { GitHubRepository } from '../types';

/**
 * Analyzes GitHub releases to determine if they include features and fixes
 */
export function analyzeChangelogContent(repository: GitHubRepository): { hasFeats: boolean; hasFixes: boolean } {
  if (!repository.releases || repository.releases.length === 0) {
    return { hasFeats: false, hasFixes: false };
  }

  // Check recent releases (last 10) for feature and fix patterns
  const recentReleases = repository.releases.slice(0, 10);

  let hasFeats = false;
  let hasFixes = false;

  for (const release of recentReleases) {
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