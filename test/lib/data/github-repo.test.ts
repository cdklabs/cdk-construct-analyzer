import { GitHubRepo } from '../../../src/lib/data/github-repo';

const mockedFetch = jest.fn();
global.fetch = mockedFetch;

describe('GitHubRepo', () => {
  let githubRepo: GitHubRepo;

  beforeEach(() => {
    githubRepo = new GitHubRepo('test-owner', 'test-repo');
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should set owner and repo properties', () => {
      expect(githubRepo.owner).toBe('test-owner');
      expect(githubRepo.repo).toBe('test-repo');
    });
  });

  describe('metadata', () => {
    test('should fetch repository metadata successfully', async () => {
      const mockData = { id: 123, name: 'test-repo', stargazers_count: 42 };
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      } as Response);

      const result = await githubRepo.metadata();

      expect(mockedFetch).toHaveBeenCalledWith('https://api.github.com/repos/test-owner/test-repo');
      expect(result).toEqual({
        data: mockData,
        status: 200,
      });
    });

    test('should handle API errors gracefully', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await githubRepo.metadata();

      expect(result).toEqual({
        error: 'GitHub API returned 404',
        status: 404,
      });
    });
  });

  describe('file', () => {
    test('should fetch file content successfully', async () => {
      const mockData = { content: 'base64content', encoding: 'base64' };
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      } as Response);

      const result = await githubRepo.file('README.md');

      expect(mockedFetch).toHaveBeenCalledWith('https://api.github.com/repos/test-owner/test-repo/contents/README.md');
      expect(result).toEqual({
        data: mockData,
        status: 200,
      });
    });

    test('should handle file not found', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await githubRepo.file('nonexistent.txt');

      expect(result).toEqual({
        error: 'GitHub API returned 404',
        status: 404,
      });
    });
  });

  describe('contents', () => {
    test('should fetch root directory contents by default', async () => {
      const mockData = [{ name: 'README.md', type: 'file' }];
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      } as Response);

      const result = await githubRepo.contents();

      expect(mockedFetch).toHaveBeenCalledWith('https://api.github.com/repos/test-owner/test-repo/contents/');
      expect(result).toEqual({
        data: mockData,
        status: 200,
      });
    });

    test('should fetch specific directory contents', async () => {
      const mockData = [{ name: 'index.ts', type: 'file' }];
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      } as Response);

      const result = await githubRepo.contents('src');

      expect(mockedFetch).toHaveBeenCalledWith('https://api.github.com/repos/test-owner/test-repo/contents/src');
      expect(result).toEqual({
        data: mockData,
        status: 200,
      });
    });

    test('should handle directory not found', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await githubRepo.contents('nonexistent');

      expect(result).toEqual({
        error: 'GitHub API returned 404',
        status: 404,
      });
    });
  });
});