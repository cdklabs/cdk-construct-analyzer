export interface GitHubRawData {
  readonly repoData: any; // Full GitHub API response
  readonly repoContents: Record<string, boolean>; // path -> exists
  readonly readmeContent: string | null; // README file content
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
  private rawData?: GitHubRawData;

  async fetchPackage(repositoryUrl: string): Promise<void> {
    const repoInfo = extractRepoInfo(repositoryUrl);
    if (!repoInfo) {
      throw new Error(`Could not parse GitHub URL: ${repositoryUrl}`);
    }

    const githubRepo = new GitHubRepo(repoInfo.owner, repoInfo.repo);

    try {
      // Fetch basic repo data
      const response = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`);
      if (!response.ok) {
        throw new Error(`GitHub API returned ${response.status}`);
      }

      const repoData = await response.json() as any;

      // Fetch all file/directory existence data
      const repoContents = await this.fetchAllRepoContents(repoInfo.owner, repoInfo.repo);

      // Fetch README content using the discovered files
      const readmeContent = await this.fetchReadmeContent(repoInfo.owner, repoInfo.repo, repoContents);

      this.rawData = {
        repoData,
        repoContents,
        readmeContent,
      };
    } catch (error) {
      throw new Error(`GitHub fetch failed: ${error}`);
    }
  }

  private async fetchAllRepoContents(owner: string, repo: string): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    try {
      // Only fetch root directory contents - documentation should be easily discoverable
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/`);
      if (!response.ok) return results;

      const data = await response.json() as any;
      if (!Array.isArray(data)) return results;

      // Process all items in the root directory
      for (const item of data) {
        results[item.name] = true;
      }
    } catch (error) {
      console.warn(`Failed to fetch repository contents: ${error}`);
    }

    return results;
  }

  private async fetchReadmeContent(owner: string, repo: string, repoContents: Record<string, boolean>): Promise<string | null> {
    // Find README file from the root directory contents
    const readmeFile = Object.keys(repoContents).find(filename =>
      filename.toLowerCase().includes('readme'),
    );

    if (!readmeFile) {
      return null;
    }

    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${readmeFile}`);
      if (response.ok) {
        const data = await response.json() as any;
        if (data.content && data.encoding === 'base64') {
          return atob(data.content);
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch README content: ${error}`);
    }

    return null;
  }

  getRawData(): GitHubRawData {
    if (!this.rawData) {
      throw new Error('Must call fetchPackage() first');
    }
    return this.rawData;
  }
}