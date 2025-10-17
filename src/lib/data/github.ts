export interface GitHubData {
  readonly stars: number;
  readonly hasReadme: boolean;
  readonly hasApiDocs: boolean;
  readonly hasExamples: boolean;
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
  private hasReadme?: boolean;
  private hasApiDocs?: boolean;
  private hasExamples?: boolean;

  async fetchPackage(repositoryUrl: string): Promise<void> {
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

      // Fetch documentation data
      await this.fetchDocumentationData(repoInfo.owner, repoInfo.repo);
    } catch (error) {
      throw new Error(`GitHub fetch failed: ${error}`);
    }
  }

  private async fetchDocumentationData(owner: string, repo: string): Promise<void> {
    try {
      // Check for README
      this.hasReadme = await this.checkFileExists(owner, repo, 'README.md') ||
                       await this.checkFileExists(owner, repo, 'README.rst') ||
                       await this.checkFileExists(owner, repo, 'README.txt') ||
                       await this.checkFileExists(owner, repo, 'README');

      // Check for API documentation (common patterns)
      this.hasApiDocs = await this.checkFileExists(owner, repo, 'docs/api.md') ||
                        await this.checkFileExists(owner, repo, 'docs/API.md') ||
                        await this.checkFileExists(owner, repo, 'API.md') ||
                        await this.checkDirectoryExists(owner, repo, 'docs') ||
                        await this.checkDirectoryExists(owner, repo, 'documentation');

      // Check for examples
      this.hasExamples = await this.checkDirectoryExists(owner, repo, 'examples') ||
                         await this.checkDirectoryExists(owner, repo, 'example') ||
                         await this.checkFileExists(owner, repo, 'examples.md') ||
                         await this.checkFileExists(owner, repo, 'EXAMPLES.md');
    } catch (error) {
      // If documentation check fails, default to false
      this.hasReadme = false;
      this.hasApiDocs = false;
      this.hasExamples = false;
    }
  }

  private async checkFileExists(owner: string, repo: string, path: string): Promise<boolean> {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async checkDirectoryExists(owner: string, repo: string, path: string): Promise<boolean> {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`);
      if (!response.ok) return false;

      const data = await response.json() as any;
      return Array.isArray(data) && data.length > 0;
    } catch {
      return false;
    }
  }

  getStarCount(): number {
    return this.starCount || 0;
  }

  getData(): GitHubData {
    return {
      stars: this.getStarCount(),
      hasReadme: this.hasReadme ?? false,
      hasApiDocs: this.hasApiDocs ?? false,
      hasExamples: this.hasExamples ?? false,
    };
  }
}