import { GitHubCollector } from '../../../src/lib/data/github';
import { GitHubRepo } from '../../../src/lib/data/github-repo';

// Mock fetch globally
global.fetch = jest.fn();
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('GitHubCollector', () => {
  let collector: GitHubCollector;

  beforeEach(() => {
    collector = new GitHubCollector();
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => { });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('fetchPackage', () => {
    test('should work with GitHubRepo instances', async () => {
      // Mock all fetch calls to return empty/default responses
      mockedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ stargazers_count: 100 }),
      } as Response);

      const repo1 = new GitHubRepo('test', 'repo');
      await collector.fetchPackage(repo1);
      expect(mockedFetch).toHaveBeenCalledWith('https://api.github.com/repos/test/repo');

      jest.clearAllMocks();
      const repo2 = new GitHubRepo('facebook', 'react');
      await collector.fetchPackage(repo2);
      expect(mockedFetch).toHaveBeenCalledWith('https://api.github.com/repos/facebook/react');
    });

    test('should handle API errors', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const repo = new GitHubRepo('test', 'repo');
      await expect(collector.fetchPackage(repo)).rejects.toThrow(
        'GitHub API returned 404',
      );
    });
  });

  describe('getRawData', () => {
    test('should throw error if no data fetched', () => {
      expect(() => collector.getRawData()).toThrow('Must call fetchPackage() first');
    });

    test('should return raw data after successful fetch', async () => {
      // Mock successful responses
      mockedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ stargazers_count: 500 }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ name: 'README.md', type: 'file' }],
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ content: btoa('# Test'), encoding: 'base64' }),
        } as Response);

      const repo = new GitHubRepo('test', 'repo');
      await collector.fetchPackage(repo);

      const rawData = collector.getRawData();
      expect(rawData.repoData.stargazers_count).toBe(500);
      expect(rawData.repoContents).toBeDefined();
      expect(rawData.readmeContent).toBe('# Test');
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