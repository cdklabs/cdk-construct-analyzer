import { GitHubRepository } from '../types';

export interface GitHubApiResponse {
  data?: { repository: GitHubRepository };
  error?: string;
}

export class GitHubRepo {
  private readonly graphqlUrl = 'https://api.github.com/graphql';

  constructor(readonly owner: string, readonly repo: string) { }

  async metadata(): Promise<GitHubApiResponse> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const sinceDate = oneYearAgo.toISOString();

    const contentsQuery = `
      query GetRepositoryData($owner: String!, $name: String!, $since: GitTimestamp!) {
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
          
          # Get commits from the last month to count contributors
          defaultBranchRef {
            target {
              ... on Commit {
                history(first: 100, since: $since) {
                  nodes {
                    author {
                      user {
                        login
                      }
                      email
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const contentsResult = await this.executeQuery(contentsQuery, {
      owner: this.owner,
      name: this.repo,
      since: sinceDate,
    });

    if (contentsResult.error || !contentsResult.data?.repository) {
      return contentsResult;
    }

    const repository = contentsResult.data.repository as any;
    const entries = repository.rootContents?.entries ?? [];

    const readmeFile = entries.find((entry: any) =>
      entry.type === 'blob' &&
      entry.name.toLowerCase().startsWith('readme'),
    );

    if (!readmeFile) {
      return {
        data: {
          repository: {
            stargazerCount: repository.stargazerCount,
            rootContents: repository.rootContents,
            commits: repository.defaultBranchRef?.target?.history?.nodes ?? [],
          } as GitHubRepository,
        },
      };
    }

    // Second query: Get README content only
    const readmeQuery = `
      query GetReadmeContent($owner: String!, $name: String!, $path: String!) {
        repository(owner: $owner, name: $name) {
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

    // Extract README text
    const readmeText = (readmeResult.data.repository as any).readme?.text;

    return {
      data: {
        repository: {
          stargazerCount: repository.stargazerCount,
          rootContents: repository.rootContents,
          readmeContent: readmeText,
          commits: repository.defaultBranchRef?.target?.history?.nodes ?? [],
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
        error: `Network error: ${error.message ?? 'Unknown error'}`,
      };
    }
  }
}