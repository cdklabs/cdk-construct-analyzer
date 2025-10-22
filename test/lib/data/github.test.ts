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

      const repo1 = new GitHubRepo('cdklabs', 'repo1');
      await collector.fetchPackage(repo1);
      expect(mockedFetch).toHaveBeenCalledWith('https://api.github.com/repos/cdklabs/repo1');

      jest.clearAllMocks();
      const repo2 = new GitHubRepo('cdklabs', 'repo2');
      await collector.fetchPackage(repo2);
      expect(mockedFetch).toHaveBeenCalledWith('https://api.github.com/repos/cdklabs/repo2');
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

  describe('contributors data fetching', () => {
    test('should fetch contributors data and include it in raw data', async () => {
      const mockRepoResponse = { stargazers_count: 100 };
      const mockContentsResponse = [{ name: 'README.md', type: 'file' }];
      const mockReadmeResponse = { content: btoa('# Test'), encoding: 'base64' };
      const mockCommitsResponse = [
        { author: { login: 'user1' }, commit: { message: 'Add feature' } },
        { author: { login: 'user2' }, commit: { message: 'Fix bug' } },
        { author: { login: 'dependabot[bot]' }, commit: { message: 'chore(deps): bump version' } },
      ];

      mockedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRepoResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockContentsResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockReadmeResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCommitsResponse,
        } as Response);

      const repo = new GitHubRepo('test', 'repo');
      await collector.fetchPackage(repo);

      const rawData = collector.getRawData();
      expect(rawData.contributorsData).toBeDefined();
      expect(rawData.contributorsData).toHaveLength(3);
    });
  });
});