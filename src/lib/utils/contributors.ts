import type { GitHubCommit } from '../types';

/**
 * Contributor-related utility functions
 */

/**
 * Process contributors data to count unique human contributors from the last month
 */
export function processContributorsData(contributorsData?: GitHubCommit[]): number {
  if (!contributorsData?.length) {
    return 0;
  }

  const contributors = new Set<string>();

  for (const commit of contributorsData) {
    if (commit.author?.user?.login && !isBotOrAutomated(commit.author.user.login)) {
      contributors.add(commit.author.user.login);
    } else if (commit.author?.email && !isBotOrAutomated(commit.author.email)) {
      contributors.add(commit.author.email);
    }
  }

  return contributors.size;
}

/**
 * Check if a username or commit message indicates bot/automated activity
 */
export function isBotOrAutomated(username: string): boolean {
  const botPatterns = [
    /bot/i, // Match "bot" anywhere in the string
    /^automation/i,
  ];

  if (botPatterns.some(pattern => pattern.test(username))) {
    return true;
  }

  return false;
}