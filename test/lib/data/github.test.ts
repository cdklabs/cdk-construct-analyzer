import { GitHubCollector } from '../../../src/lib/data/github';

// Mock fetch globally
global.fetch = jest.fn();
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('GitHubCollector', () => {
  let collector: GitHubCollector;

  beforeEach(() => {
    collector = new GitHubCollector();
    jest.clearAllMocks();
  });

  describe('fetchPackage', () => {
    test('should fetch GitHub data successfully with standard URL', async () => {
      const mockResponse = {
        stargazers_count: 500,
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await collector.fetchPackage('https://github.com/test/repo');

      expect(mockedFetch).toHaveBeenCalledWith('https://api.github.com/repos/test/repo');
    });

    test('should handle git+https URLs', async () => {
      const mockResponse = {
        stargazers_count: 500,
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await collector.fetchPackage('git+https://github.com/facebook/react.git');

      expect(mockedFetch).toHaveBeenCalledWith('https://api.github.com/repos/facebook/react');
    });

    test('should handle SSH URLs', async () => {
      const mockResponse = {
        stargazers_count: 500,
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await collector.fetchPackage('github.com:microsoft/typescript');

      expect(mockedFetch).toHaveBeenCalledWith('https://api.github.com/repos/microsoft/typescript');
    });

    test('should throw error for invalid GitHub URLs', async () => {
      await expect(collector.fetchPackage('https://gitlab.com/test/repo')).rejects.toThrow(
        'Could not parse GitHub URL: https://gitlab.com/test/repo',
      );
    });

    test('should handle GitHub API errors', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await expect(collector.fetchPackage('https://github.com/test/repo')).rejects.toThrow(
        'GitHub fetch failed: Error: GitHub API returned 404',
      );
    });

    test('should handle network errors', async () => {
      mockedFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(collector.fetchPackage('https://github.com/test/repo')).rejects.toThrow(
        'GitHub fetch failed: Error: Network error',
      );
    });

    test('should handle missing stargazers_count', async () => {
      const mockResponse = {};

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await collector.fetchPackage('https://github.com/test/repo');

      expect(collector.getStarCount()).toBe(0);
    });
  });

  describe('getStarCount', () => {
    test('should return star count after fetchPackage', async () => {
      const mockResponse = {
        stargazers_count: 500,
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await collector.fetchPackage('https://github.com/test/repo');

      expect(collector.getStarCount()).toBe(500);
    });

    test('should return 0 if no data fetched', () => {
      expect(collector.getStarCount()).toBe(0);
    });
  });

  describe('getData', () => {
    test('should return GitHub data object', async () => {
      const mockResponse = {
        stargazers_count: 500,
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await collector.fetchPackage('https://github.com/test/repo');

      expect(collector.getData()).toEqual({
        stars: 500,
      });
    });

    test('should return default data if no fetch performed', () => {
      expect(collector.getData()).toEqual({
        stars: 0,
      });
    });
  });

  describe('time to first response', () => {
    test('should calculate time to first response from issues', async () => {
      const mockRepoResponse = {
        stargazers_count: 500,
      };

      const mockIssues = [
        {
          id: 1,
          created_at: '2024-01-01T00:00:00Z',
          comments_url: 'https://api.github.com/repos/test/repo/issues/1/comments',
          pull_request: null,
        },
        {
          id: 2,
          created_at: '2024-01-02T00:00:00Z',
          comments_url: 'https://api.github.com/repos/test/repo/issues/2/comments',
          pull_request: null,
        },
      ];

      const mockComments1 = [
        {
          created_at: '2024-01-08T00:00:00Z', // 7 days later = 1 week
        },
      ];

      const mockComments2 = [
        {
          created_at: '2024-01-16T00:00:00Z', // 14 days later = 2 weeks
        },
      ];

      // Mock repo API call
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRepoResponse,
      } as Response);

      // Mock issues API call
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIssues,
      } as Response);

      // Mock comments API calls
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComments1,
      } as Response);

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComments2,
      } as Response);

      await collector.fetchPackage('https://github.com/test/repo');

      const data = collector.getData();
      expect(data.timeToFirstResponseWeeks).toBe(1.5); // Median of 1 and 2 weeks
    });

    test('should handle issues with no comments', async () => {
      const mockRepoResponse = {
        stargazers_count: 500,
      };

      const mockIssues = [
        {
          id: 1,
          created_at: '2024-01-01T00:00:00Z',
          comments_url: 'https://api.github.com/repos/test/repo/issues/1/comments',
          pull_request: null,
        },
      ];

      // Mock repo API call
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRepoResponse,
      } as Response);

      // Mock issues API call
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIssues,
      } as Response);

      // Mock empty comments
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      await collector.fetchPackage('https://github.com/test/repo');

      const data = collector.getData();
      expect(data.timeToFirstResponseWeeks).toBeUndefined();
    });

    test('should skip pull requests when calculating response time', async () => {
      const mockRepoResponse = {
        stargazers_count: 500,
      };

      const mockIssues = [
        {
          id: 1,
          created_at: '2024-01-01T00:00:00Z',
          comments_url: 'https://api.github.com/repos/test/repo/issues/1/comments',
          pull_request: { url: 'https://api.github.com/repos/test/repo/pulls/1' }, // This is a PR
        },
        {
          id: 2,
          created_at: '2024-01-02T00:00:00Z',
          comments_url: 'https://api.github.com/repos/test/repo/issues/2/comments',
          pull_request: null, // This is an issue
        },
      ];

      const mockComments = [
        {
          created_at: '2024-01-09T00:00:00Z', // 7 days later = 1 week
        },
      ];

      // Mock repo API call
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRepoResponse,
      } as Response);

      // Mock issues API call
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIssues,
      } as Response);

      // Mock comments API call (only for the issue, not the PR)
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComments,
      } as Response);

      await collector.fetchPackage('https://github.com/test/repo');

      const data = collector.getData();
      expect(data.timeToFirstResponseWeeks).toBe(1); // Only the issue response time
    });

    test('should handle issues API errors gracefully', async () => {
      const mockRepoResponse = {
        stargazers_count: 500,
      };

      // Mock repo API call
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRepoResponse,
      } as Response);

      // Mock issues API call failure
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      } as Response);

      await collector.fetchPackage('https://github.com/test/repo');

      const data = collector.getData();
      expect(data.timeToFirstResponseWeeks).toBeUndefined();
    });
  });
});