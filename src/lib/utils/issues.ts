import { GitHubIssue } from '../types';
import { isBotOrAutomated } from './contributors';

/**
 * Calculate average time to first response for issues (in weeks)
 */
export function calculateTimeToFirstResponse(issues?: GitHubIssue[]): number | undefined {
  if (!issues || issues.length === 0) {
    return undefined;
  }

  const responseTimes: number[] = [];

  for (const issue of issues) {
    if (!issue.author?.login || !issue.comments?.nodes?.length) {
      continue;
    }

    const issueCreatedAt = new Date(issue.createdAt);
    const issueAuthor = issue.author.login;

    // Find first response from someone other than the issue author
    const firstResponse = issue.comments.nodes.find(
      comment => comment.author?.login &&
        comment.author.login !== issueAuthor &&
        !isBotOrAutomated(comment.author.login),
    );

    if (firstResponse) {
      const responseTime = new Date(firstResponse.createdAt);
      const timeDiffMs = responseTime.getTime() - issueCreatedAt.getTime();
      const timeDiffWeeks = timeDiffMs / (1000 * 60 * 60 * 24 * 7);

      if (timeDiffWeeks >= 0) {
        responseTimes.push(timeDiffWeeks);
      }
    }
  }

  if (responseTimes.length === 0) {
    return undefined;
  }

  // Calculate average
  const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  return Math.round(average * 10) / 10; // Round to 1 decimal places for better precision
}
