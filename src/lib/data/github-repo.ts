import { GitHubRepository } from '../types';

export interface GitHubApiResponse {
  data?: { repository: GitHubRepository };
  error?: string;
}

export class GitHubRepo {
  private readonly graphqlUrl = 'https://api.github.com/graphql';

  constructor(readonly owner: string, readonly repo: string) {}

  async metadata(): Promise<GitHubApiResponse> {
    // First, get the repository contents to find README file
    const contentsQuery = `
      query GetRepositoryContents($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          stargazerCount
          
          # Root directory contents (for checking docs folders and README files)
          rootContents: object(expression: "HEAD:") {
            ... on Tree {
              entries {
                name
                type
              }
            }
          }
        }
      }
    `;

    const contentsResult = await this.executeQuery(contentsQuery, { owner: this.owner, name: this.repo });

    if (contentsResult.error || !contentsResult.data?.repository) {
      return contentsResult;
    }

    const repository = contentsResult.data.repository;
    const entries = repository.rootContents?.entries ?? [];

    // Find README file (any file that starts with "readme" case-insensitive)
    const readmeFile = entries.find((entry: any) =>
      entry.type === 'blob' &&
      entry.name.toLowerCase().startsWith('readme'),
    );

    if (!readmeFile) {
      return {
        data: {
          repository: {
            ...repository,
          } as GitHubRepository,
        },
      };
    }

    // Second query to get the README content
    const readmeQuery = `
      query GetReadmeContent($owner: String!, $name: String!, $path: String!) {
        repository(owner: $owner, name: $name) {
          stargazerCount
          
          rootContents: object(expression: "HEAD:") {
            ... on Tree {
              entries {
                name
                type
              }
            }
          }
          
          readme: object(expression: $path) {
            ... on Blob {
              text
            }
          }
        }
      }
    `;

    const readmeResult = await this.executeQuery(readmeQuery, {
      owner: this.owner,
      name: this.repo,
      path: `HEAD:${readmeFile.name}`,
    });

    if (readmeResult.error || !readmeResult.data?.repository) {
      return readmeResult;
    }

    // Extract README text and return as simple string
    const readmeText = (readmeResult.data.repository as any).readme?.text;

    return {
      data: {
        repository: {
          stargazerCount: readmeResult.data.repository.stargazerCount,
          rootContents: readmeResult.data.repository.rootContents,
          readmeContent: readmeText,
        } as GitHubRepository,
      },
    };
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