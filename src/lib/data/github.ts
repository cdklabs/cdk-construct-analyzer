import { GitHubRepo } from './github-repo';

export interface GitHubRawData {
  readonly repoData: any; // Full GitHub API response
  readonly repoContents: Record<string, boolean>; // path -> exists
  readonly readmeContent?: string; // README file content
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
      const metadataResponse = await githubRepo.metadata();
      if (metadataResponse.error) {
        throw new Error(metadataResponse.error);
      }

      const repoData = metadataResponse.data;

      // Fetch all root directory contents
      const contentsResponse = await githubRepo.contents();
      const repoContents: Record<string, boolean> = {};

      if (!contentsResponse.error && Array.isArray(contentsResponse.data)) {
        for (const item of contentsResponse.data) {
          repoContents[item.name] = true;
        }
      }

      // Find and fetch README content
      const readmeFile = Object.keys(repoContents).find(filename =>
        filename.toLowerCase().includes('readme'),
      );

      let readmeContent;
      if (readmeFile) {
        const fileResponse = await githubRepo.contents(readmeFile);
        if (!fileResponse.error && fileResponse.data?.content && fileResponse.data?.encoding === 'base64') {
          readmeContent = atob(fileResponse.data.content);
        }
      }

      this.rawData = {
        repoData,
        repoContents,
        readmeContent,
      };
    } catch (error) {
      throw new Error(`GitHub fetch failed: ${error}`);
    }
  }

  getRawData(): GitHubRawData {
    if (!this.rawData) {
      throw new Error('Must call fetchPackage() first');
    }
    return this.rawData;
  }
}