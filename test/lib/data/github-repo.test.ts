import { GitHubRepo } from '../../../src/lib/data/github-repo';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('GitHubRepo', () => {
  let githubRepo: GitHubRepo;

  beforeEach(() => {
    githubRepo = new GitHubRepo('cdklabs', 'test-repo');
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should set owner and repo properties', () => {
      expect(githubRepo.owner).toBe('cdklabs');
      expect(githubRepo.repo).toBe('test-repo');
    });
  });

  describe('metadata', () => {
    test('should fetch repository data with README successfully', async () => {
      const mockContentsResponse = {
        data: {
          repository: {
            stargazerCount: 42,
            rootContents: {
              entries: [
                { name: 'README.md', type: 'blob' },
                { name: 'package.json', type: 'blob' },
                { name: 'docs', type: 'tree' },
              ],
            },
            defaultBranchRef: {
              target: {
                history: {
                  nodes: [],
                },
              },
            },
            issues: {
              nodes: [],
            },
            releases: {
              nodes: [],
            },
          },
        },
      };

      const mockReadmeResponse = {
        data: {
          repository: {
            readme: {
              text: '# Test Repository\n\nThis is a test.',
            },
          },
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockContentsResponse,
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockReadmeResponse,
        } as any);

      const result = await githubRepo.metadata();

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        data: {
          repository: {
            stargazerCount: 42,
            rootContents: {
              entries: [
                { name: 'README.md', type: 'blob' },
                { name: 'package.json', type: 'blob' },
                { name: 'docs', type: 'tree' },
              ],
            },
            readmeContent: '# Test Repository\n\nThis is a test.',
            commits: [],
            issues: [],
            releases: [],
          },
        },
      });
    });

    test('should handle repository with no README', async () => {
      const mockContentsResponse = {
        data: {
          repository: {
            stargazerCount: 42,
            rootContents: {
              entries: [
                { name: 'package.json', type: 'blob' },
                { name: 'src', type: 'tree' },
              ],
            },
            defaultBranchRef: {
              target: {
                history: {
                  nodes: [],
                },
              },
            },
            issues: {
              nodes: [],
            },
            releases: {
              nodes: [],
            },
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockContentsResponse,
      } as any);

      const result = await githubRepo.metadata();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        data: {
          repository: {
            stargazerCount: 42,
            rootContents: {
              entries: [
                { name: 'package.json', type: 'blob' },
                { name: 'src', type: 'tree' },
              ],
            },
            commits: [],
            issues: [],
            releases: [],
          },
        },
      });
    });

    test('should handle GraphQL errors gracefully', async () => {
      const mockResponseData = {
        errors: [{ message: 'Repository not found' }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
      } as any);

      const result = await githubRepo.metadata();

      expect(result).toEqual({
        error: 'GraphQL errors: Repository not found',
      });
    });

    test('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as any);

      const result = await githubRepo.metadata();

      expect(result).toEqual({
        error: 'GitHub GraphQL API returned 401: Unauthorized',
      });
    });

    test('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const result = await githubRepo.metadata();

      expect(result).toEqual({
        error: 'Network error: Network failure',
      });
    });

    test('should include authorization header when token is provided', async () => {
      process.env.GITHUB_TOKEN = 'test-token';

      const mockResponse = {
        data: {
          repository: {
            stargazerCount: 42,
            rootContents: { entries: [] },
            defaultBranchRef: {
              target: {
                history: {
                  nodes: [],
                },
              },
            },
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any);

      await githubRepo.metadata();

      expect(mockFetch).toHaveBeenCalledWith('https://api.github.com/graphql', expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'cdk-construct-analyzer',
          'Authorization': 'Bearer test-token',
        },
        body: expect.stringContaining('query GetRepositoryData'),
      }));

      delete process.env.GITHUB_TOKEN;
    });
  });
});