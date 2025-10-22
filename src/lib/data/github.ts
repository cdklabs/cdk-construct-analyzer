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

  private async fetchContributorsLastMonth(): Promise<number> {
    if (!this.repoInfo) {
      return 0;
    }

    try {
      // Calculate date one month ago
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const since = oneMonthAgo.toISOString();

      // Fetch commits from the past month
      const commitsUrl = `https://api.github.com/repos/${this.repoInfo.owner}/${this.repoInfo.repo}/commits?since=${since}&per_page=100`;
      const response = await fetch(commitsUrl);

      if (!response.ok) {
        console.warn(`Failed to fetch commits: ${response.status}`);
        return 0;
      }

      const commits = await response.json() as any[];

      // Extract unique contributors, excluding bots and automated commits
      const contributors = new Set<string>();

      for (const commit of commits) {
        const author = commit.author;
        const committer = commit.committer;

        // Skip if no author info
        if (!author?.login) continue;

        // Skip bots and automated accounts
        if (this.isBotOrAutomated(author.login, commit.commit?.message || '')) {
          continue;
        }

        contributors.add(author.login);

        // Also count committer if different from author and not a bot
        if (committer?.login &&
            committer.login !== author.login &&
            !this.isBotOrAutomated(committer.login, commit.commit?.message || '')) {
          contributors.add(committer.login);
        }
      }

      return contributors.size;
    } catch (error) {
      console.warn(`Failed to fetch contributors: ${error}`);
      return 0;
    }
  }

  private isBotOrAutomated(username: string, commitMessage: string): boolean {
    // Common bot patterns in usernames
    const botPatterns = [
      /bot$/i,
      /\[bot\]$/i,
      /^dependabot/i,
      /^renovate/i,
      /^greenkeeper/i,
      /^snyk-bot/i,
      /^github-actions/i,
      /^codecov/i,
      /^semantic-release/i,
      /^automation/i,
      /^ci-/i,
      /^auto-/i,
    ];

    // Check username patterns
    if (botPatterns.some(pattern => pattern.test(username))) {
      return true;
    }

    // Common automated commit message patterns
    const automatedMessagePatterns = [
      /^chore\(deps\):/i,
      /^chore\(release\):/i,
      /^bump version/i,
      /^update dependencies/i,
      /^automated/i,
      /^auto-/i,
      /^\d+\.\d+\.\d+$/, // Version numbers only
      /^release \d+\.\d+\.\d+/i,
    ];

    // Check commit message patterns
    if (automatedMessagePatterns.some(pattern => pattern.test(commitMessage.trim()))) {
      return true;
    }

    return false;
  }

  getStarCount(): number {
    return this.starCount || 0;
  }

  getContributorsLastMonth(): number {
    return this.contributorsLastMonth || 0;
  }

  getData(): GitHubData {
    return {
      stars: this.getStarCount(),
      contributorsLastMonth: this.getContributorsLastMonth(),
    };
  }
}