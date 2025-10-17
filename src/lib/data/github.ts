export interface GitHubData {
  readonly stars: number;
  readonly contributorsLastMonth: number;
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
  private contributorsLastMonth?: number;
  private repoInfo?: { owner: string; repo: string };

  async fetchPackage(repositoryUrl: string): Promise<void> {
    const repoInfo = extractRepoInfo(repositoryUrl);
    if (!repoInfo) {
      throw new Error(`Could not parse GitHub URL: ${repositoryUrl}`);
    }

    this.repoInfo = repoInfo;

    try {
      // Fetch basic repo data
      const response = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`);
      if (!response.ok) {
        throw new Error(`GitHub API returned ${response.status}`);
      }

      const fullResponse = await response.json() as any;
      this.starCount = fullResponse.stargazers_count || 0;

      // Fetch contributors from the past month
      this.contributorsLastMonth = await this.fetchContributorsLastMonth();
    } catch (error) {
      throw new Error(`GitHub fetch failed: ${error}`);
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