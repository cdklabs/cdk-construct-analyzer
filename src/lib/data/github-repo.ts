import { GitHubRepository } from '../types';

export interface GitHubApiResponse {
  data?: { repository: GitHubRepository };
  error?: string;
}

export class GitHubRepo {
  private readonly graphqlUrl = 'https://api.github.com/graphql';

  constructor(readonly owner: string, readonly repo: string) {}

  async metadata(): Promise<GitHubApiResponse> {
    const query = `
      query GetRepositoryEssentials($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          stargazerCount
          
          # Root directory contents (for checking docs folders)
          rootContents: object(expression: "HEAD:") {
            ... on Tree {
              entries {
                name
                type
              }
            }
          }
          
          # README content variations (for checking examples)
          readme: object(expression: "HEAD:README.md") {
            ... on Blob {
              text
            }
          }
          readmeAlternative: object(expression: "HEAD:readme.md") {
            ... on Blob {
              text
            }
          }
          readmeTxt: object(expression: "HEAD:README.txt") {
            ... on Blob {
              text
            }
          }
        }
      }
    `;

    return this.executeQuery(query, { owner: this.owner, name: this.repo });
  }

  private async executeQuery(query: string, variables: Record<string, any>): Promise<GitHubApiResponse> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'cdk-construct-analyzer',
      };

      const token = process.env.GITHUB_TOKEN;
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(this.graphqlUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        return {
          error: `GitHub GraphQL API returned ${response.status}: ${response.statusText}`,
        };
      }

      const result = await response.json() as any;

      if (result.errors) {
        return {
          error: `GraphQL errors: ${result.errors.map((e: any) => e.message).join(', ')}`,
        };
      }

      return { data: result.data };
    } catch (error: any) {
      return {
        error: `Network error: ${error.message || 'Unknown error'}`,
      };
    }
  }
}