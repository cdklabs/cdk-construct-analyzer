import { GitHubCollector } from '../../../src/lib/data/github';

// Mock fetch globally
global.fetch = jest.fn();
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('GitHubCollector', () => {
  let collector: GitHubCollector;

  beforeEach(() => {
    collector = new GitHubCollector();
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('fetchPackage', () => {
    test('should parse GitHub URLs correctly', async () => {
      // Mock all fetch calls to return empty/default responses
      mockedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ stargazers_count: 100 }),
      } as Response);

      await collector.fetchPackage('https://github.com/test/repo');
      expect(mockedFetch).toHaveBeenCalledWith('https://api.github.com/repos/test/repo');

      jest.clearAllMocks();
      await collector.fetchPackage('git+https://github.com/facebook/react.git');
      expect(mockedFetch).toHaveBeenCalledWith('https://api.github.com/repos/facebook/react');
    });

    test('should throw error for invalid URLs', async () => {
      await expect(collector.fetchPackage('https://gitlab.com/test/repo')).rejects.toThrow(
        'Could not parse GitHub URL',
      );
    });

    test('should handle API errors', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await expect(collector.fetchPackage('https://github.com/test/repo')).rejects.toThrow(
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

      await collector.fetchPackage('https://github.com/test/repo');

      const rawData = collector.getRawData();
      expect(rawData.repoData.stargazers_count).toBe(500);
      expect(rawData.repoContents).toBeDefined();
      expect(rawData.readmeContent).toBe('# Test');
    });
  });
});