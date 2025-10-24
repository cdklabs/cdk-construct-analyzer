import { collectPackageData, extractRepoInfo } from '../../../src/lib/data/collect';
import { GitHubRepo } from '../../../src/lib/data/github-repo';
import { NpmCollector } from '../../../src/lib/data/npm';

// Mock the collectors
jest.mock('../../../src/lib/data/npm');
jest.mock('../../../src/lib/data/github-repo');

const MockedNpmCollector = NpmCollector as jest.MockedClass<typeof NpmCollector>;
const MockedGitHubRepo = GitHubRepo as jest.MockedClass<typeof GitHubRepo>;

describe('collectPackageData', () => {
  const mockNpmData = {
    name: 'test-package',
    version: '1.0.0',
    repository: {
      url: 'https://github.com/cdklabs/repo',
    },
  };

  const mockDownloadData = {
    downloads: 10000,
  };

  const mockGitHubData = {
    stargazerCount: 500,
    rootContents: {
      entries: [
        { name: 'README.md', type: 'blob' as const },
        { name: 'docs', type: 'tree' as const },
        { name: 'examples', type: 'tree' as const },
      ],
    },
    readmeContent: '# Test Package\n\n```js\nconsole.log("example1");\n```\n\n```js\nconsole.log("example2");\n```',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock console methods
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should collect data from npm and github successfully', async () => {
    const mockNpmInstance = {
      fetchPackage: jest.fn().mockResolvedValue(undefined),
      getPackageData: jest.fn().mockReturnValue(mockNpmData),
      getDownloadData: jest.fn().mockResolvedValue(mockDownloadData),
    };

    const mockGitHubInstance = {
      metadata: jest.fn().mockResolvedValue({
        data: { repository: mockGitHubData },
      }),
    };

    MockedNpmCollector.mockImplementation(() => mockNpmInstance as any);
    MockedGitHubRepo.mockImplementation(() => mockGitHubInstance as any);

    const result = await collectPackageData('test-package');

    expect(mockNpmInstance.fetchPackage).toHaveBeenCalledWith('test-package');
    expect(MockedGitHubRepo).toHaveBeenCalledWith('cdklabs', 'repo');
    expect(mockGitHubInstance.metadata).toHaveBeenCalled();

    expect(result).toEqual({
      version: '1.0.0',
      weeklyDownloads: 10000,
      githubStars: 500,
      documentationCompleteness: {
        hasReadme: true,
        hasApiDocs: true,
        hasExample: true,
        multipleExamples: true,
      },
    });
  });

  test('should handle github fetch errors gracefully', async () => {
    const mockNpmInstance = {
      fetchPackage: jest.fn().mockResolvedValue(undefined),
      getPackageData: jest.fn().mockReturnValue(mockNpmData),
      getDownloadData: jest.fn().mockResolvedValue(mockDownloadData),
    };

    const mockGitHubInstance = {
      metadata: jest.fn().mockResolvedValue({
        error: 'GitHub API error',
      }),
    };

    MockedNpmCollector.mockImplementation(() => mockNpmInstance as any);
    MockedGitHubRepo.mockImplementation(() => mockGitHubInstance as any);

    const result = await collectPackageData('test-package');

    expect(console.warn).toHaveBeenCalledWith('GitHub fetch failed: GitHub API error');

    expect(result).toEqual({
      version: '1.0.0',
    });
  });

  describe('URL parsing helper', () => {
    test('should parse GitHub URLs correctly', () => {
      const repo1 = extractRepoInfo('https://github.com/test/repo');
      expect(repo1.owner).toBe('test');
      expect(repo1.repo).toBe('repo');

      const repo2 = extractRepoInfo('git+https://github.com/facebook/react.git');
      expect(repo2.owner).toBe('facebook');
      expect(repo2.repo).toBe('react');
    });

    test('should throw error for invalid URLs', () => {
      expect(() => extractRepoInfo('https://gitlab.com/test/repo')).toThrow(
        'Could not parse GitHub URL',
      );
    });
  });
});