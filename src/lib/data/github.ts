import { GitHubRepo, GitHubApiResponse } from './github-repo';

export interface GitHubRawData {
  readonly repoData: any; // Full GitHub API response
  readonly repoContents: Record<string, boolean>; // path -> exists
  readonly readmeContent?: string; // README file content
}

export class GitHubCollector {
  private rawData?: GitHubRawData;

  private handleResponse(response: GitHubApiResponse): any {
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data;
  }

  async fetchPackage(githubRepo: GitHubRepo): Promise<void> {
    const repoData = await this.fetchRepoMetadata(githubRepo);
    const repoContents = await this.fetchRepoContents(githubRepo);
    const readmeContent = await this.fetchReadmeContent(githubRepo, repoContents);

    this.rawData = {
      repoData,
      repoContents,
      ...(readmeContent && { readmeContent }),
    };
  }

  private async fetchRepoMetadata(githubRepo: GitHubRepo): Promise<any> {
    const response = await githubRepo.metadata();
    return this.handleResponse(response);
  }

  private async fetchRepoContents(githubRepo: GitHubRepo): Promise<Record<string, boolean>> {
    const response = await githubRepo.contents();
    const repoContents: Record<string, boolean> = {};

    if (!response.error && Array.isArray(response.data)) {
      for (const item of response.data) {
        repoContents[item.name] = true;
      }
    }
    return repoContents;
  }

  private async fetchReadmeContent(githubRepo: GitHubRepo, repoContents: Record<string, boolean>): Promise<string | undefined> {
    try {
      const readmeFile = Object.keys(repoContents).find(filename =>
        filename.toLowerCase().startsWith('readme'),
      );

      if (!readmeFile) {
        return undefined;
      }

      const response = await githubRepo.contents(readmeFile);
      if (!response.error && response.data?.content && response.data?.encoding === 'base64') {
        return atob(response.data.content);
      }

      return undefined;
    } catch (error) {
      console.warn(`Failed to fetch README: ${error}`);
      return undefined;
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