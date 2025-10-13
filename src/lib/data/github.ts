export interface GitHubData {
  stars: number;
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

  async fetchAll(repositoryUrl: string): Promise<void> {
    const repoInfo = extractRepoInfo(repositoryUrl);
    if (!repoInfo) {
      throw new Error(`Could not parse GitHub URL: ${repositoryUrl}`);
    }

    try {
      const response = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`);
      if (!response.ok) {
        throw new Error(`GitHub API returned ${response.status}`);
      }

      const fullResponse = await response.json() as any;
      this.starCount = fullResponse.stargazers_count || 0;
    } catch (error) {
      throw new Error(`GitHub fetch failed: ${error}`);
    }
  }

  getStarCount(): number {
    return this.starCount || 0;
  }

  getData(): GitHubData {
    return {
      stars: this.getStarCount(),
    };
  }
}