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
});