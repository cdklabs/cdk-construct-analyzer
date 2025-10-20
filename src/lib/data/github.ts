export interface GitHubData {
  readonly stars: number;
  readonly timeToFirstResponseWeeks?: number;
}

function extractRepoInfo(repositoryUrl: string): { owner: string; repo: string } | null {
  const patterns = [
    /github\.com[\/:]([^\/]+)\/([^\/\.]+)/, // "https://github.com/yargs/yargs"
    /git\+https:\/\/github\.com\/([^\/]+)\/([^\/\.]+)/, // "git+https://github.com/facebook/react.git"
    /https:\/\/github\.com\/([^\/]+)\/([^\/\.]+)/, // "github.com:microsoft/typescript"
  ];

  for (const pattern of patterns) {
    const match = repositoryUrl.match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ''),
      };
    }
  }
  return null;
}

export class GitHubCollector {
  // Only store data that could be shared across multiple signals
  private starCount?: number;
  private timeToFirstResponseWeeks?: number;

  async fetchPackage(repositoryUrl: string): Promise<void> {
    const repoInfo = extractRepoInfo(repositoryUrl);
    if (!repoInfo) {
      throw new Error(`Could not parse GitHub URL: ${repositoryUrl}`);
    }

    try {
      // Fetch repository data
      const repoResponse = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`);
      if (!repoResponse.ok) {
        throw new Error(`GitHub API returned ${repoResponse.status}`);
      }

      const repoData = await repoResponse.json() as any;
      this.starCount = repoData.stargazers_count || 0;

      // Fetch time to first response data
      await this.fetchTimeToFirstResponse(repoInfo.owner, repoInfo.repo);
    } catch (error) {
      throw new Error(`GitHub fetch failed: ${error}`);
    }
  }

  private async fetchTimeToFirstResponse(owner: string, repo: string): Promise<void> {
    try {
      // Fetch recent closed issues to calculate average time to first response
      const issuesResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues?state=closed&per_page=30&sort=updated`,
      );

      if (!issuesResponse.ok) {
        console.warn(`Could not fetch issues for time to first response: ${issuesResponse.status}`);
        return;
      }

      const issues = await issuesResponse.json() as any[];
      const responseTimes: number[] = [];

      for (const issue of issues.slice(0, 10)) { // Analyze up to 10 recent issues
        if (issue.pull_request) continue; // Skip pull requests

        try {
          // Fetch comments for this issue
          const commentsResponse = await fetch(issue.comments_url);
          if (!commentsResponse.ok) continue;

          const comments = await commentsResponse.json() as any[];
          if (comments.length === 0) continue;

          const issueCreated = new Date(issue.created_at);
          const firstComment = new Date(comments[0].created_at);
          const responseTimeMs = firstComment.getTime() - issueCreated.getTime();
          const responseTimeWeeks = responseTimeMs / (1000 * 60 * 60 * 24 * 7);

          if (responseTimeWeeks >= 0) {
            responseTimes.push(responseTimeWeeks);
          }
        } catch (error) {
          // Skip this issue if we can't fetch its comments
          continue;
        }
      }

      if (responseTimes.length > 0) {
        // Calculate median response time
        responseTimes.sort((a, b) => a - b);
        const mid = Math.floor(responseTimes.length / 2);
        this.timeToFirstResponseWeeks = responseTimes.length % 2 === 0
          ? (responseTimes[mid - 1] + responseTimes[mid]) / 2
          : responseTimes[mid];
      }
    } catch (error) {
      console.warn(`Error calculating time to first response: ${error}`);
    }
  }

  getStarCount(): number {
    return this.starCount || 0;
  }

  getTimeToFirstResponseWeeks(): number | undefined {
    return this.timeToFirstResponseWeeks;
  }

  getData(): GitHubData {
    return {
      stars: this.getStarCount(),
      timeToFirstResponseWeeks: this.getTimeToFirstResponseWeeks(),
    };
  }
}