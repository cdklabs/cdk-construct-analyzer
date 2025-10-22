export interface GitHubApiResponse {
  data?: any;
  error?: string;
}

export class GitHubRepo {
  private readonly baseUrl: string;

  constructor(readonly owner: string, readonly repo: string) {
    this.baseUrl = `https://api.github.com/repos/${owner}/${repo}`;
  }

  async metadata(): Promise<GitHubApiResponse> {
    return this.fetchWithErrorHandling(this.baseUrl);
  }

  async contents(path: string = ''): Promise<GitHubApiResponse> {
    const url = path ? `${this.baseUrl}/contents/${path}` : `${this.baseUrl}/contents/`;
    return this.fetchWithErrorHandling(url);
  }

  async commits(since?: string, perPage: number = 100): Promise<GitHubApiResponse> {
    let url = `${this.baseUrl}/commits?per_page=${perPage}`;
    if (since) {
      url += `&since=${since}`;
    }
    return this.fetchWithErrorHandling(url);
  }

  private async fetchWithErrorHandling(url: string): Promise<GitHubApiResponse> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        return {
          error: `GitHub API returned ${response.status} for ${url}`,
        };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return {
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}