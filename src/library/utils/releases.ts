import type { GitHubRelease } from '../types';

/**
 * Calculate the number of releases in the past year
 */
export function calculateReleaseFrequency(releases?: GitHubRelease[]): number {
  if (!releases || releases.length === 0) {
    return 0;
  }

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const releasesInPastYear = releases.filter(release => {
    if (!release.publishedAt) {
      return false;
    }

    const publishedDate = new Date(release.publishedAt);
    return publishedDate >= oneYearAgo;
  });

  return releasesInPastYear.length;
}