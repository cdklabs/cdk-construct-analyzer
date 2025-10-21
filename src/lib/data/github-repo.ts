export interface GitHubApiResponse<T = any> {
  data?: T;
  error?: string;
  status?: number;
}

export class GitHubRepo {
  private readonly baseUrl: string;

  constructor(readonly owner: string, readonly repo: string) {
    this.baseUrl = `https://api.github.com/repos/${owner}/${repo}`;
  }

  async metadata(): Promise<GitHubApiResponse> {
    return this.fetchWithErrorHandling(this.baseUrl);
  }

  async file(filePath: string): Promise<GitHubApiResponse> {
    return this.fetchWithErrorHandling(`${this.baseUrl}/contents/${filePath}`);
  }

  async contents(path: string = ''): Promise<GitHubApiResponse> {
    const url = path ? `${this.baseUrl}/contents/${path}` : `${this.baseUrl}/contents/`;
    return this.fetchWithErrorHandling(url);
  }

  private async fetchWithErrorHandling(url: string): Promise<GitHubApiResponse> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        return {
          error: `GitHub API returned ${response.status}`,
          status: response.status,
        };
      }

      const data = await response.json();
      return { data, status: response.status };
    } catch (error) {
      return {
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}