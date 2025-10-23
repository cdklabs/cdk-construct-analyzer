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
    test('should fetch essential repository data successfully', async () => {
      const mockResponseData = {
        data: {
          repository: {
            stargazerCount: 42,
            rootContents: {
              entries: [
                { name: 'README.md', type: 'blob' as const },
                { name: 'package.json', type: 'blob' as const },
                { name: 'docs', type: 'tree' as const },
              ],
            },
            readme: {
              text: '# Test Repository\n\n```js\nconsole.log("example");\n```',
            },
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
      } as any);

      const result = await githubRepo.metadata();

      expect(mockFetch).toHaveBeenCalledWith('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'cdk-construct-analyzer',
        },
        body: expect.stringContaining('query GetRepositoryEssentials'),
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.variables).toEqual({ owner: 'cdklabs', name: 'test-repo' });
      expect(result).toEqual({
        data: mockResponseData.data,
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

    test('should handle missing README gracefully', async () => {
      const mockResponseData = {
        data: {
          repository: {
            stargazerCount: 42,
            rootContents: {
              entries: [
                { name: 'package.json', type: 'blob' as const },
              ],
            },
            readme: null,
            readmeAlternative: null,
            readmeTxt: null,
            readmeRst: null,
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
      } as any);

      const result = await githubRepo.metadata();

      expect(result).toEqual({
        data: mockResponseData.data,
      });
    });

    test('should handle empty repository contents', async () => {
      const mockResponseData = {
        data: {
          repository: {
            stargazerCount: 0,
            rootContents: null,
            readme: null,
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
      } as any);

      const result = await githubRepo.metadata();

      expect(result).toEqual({
        data: mockResponseData.data,
      });
    });
  });
});