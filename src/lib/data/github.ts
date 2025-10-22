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

  getRawData(): GitHubRawData {
    if (!this.rawData) {
      throw new Error('Must call fetchPackage() first');
    }
    return this.rawData;
  }
}