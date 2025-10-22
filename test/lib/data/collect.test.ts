import { collectPackageData, extractRepoInfo } from '../../../src/lib/data/collect';
import { GitHubCollector } from '../../../src/lib/data/github';
import { NpmCollector } from '../../../src/lib/data/npm';

// Mock the collectors
jest.mock('../../../src/lib/data/npm');
jest.mock('../../../src/lib/data/github');

const MockedNpmCollector = NpmCollector as jest.MockedClass<typeof NpmCollector>;
const MockedGitHubCollector = GitHubCollector as jest.MockedClass<typeof GitHubCollector>;

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

  const mockGitHubRawData = {
    repoData: {
      stargazers_count: 500,
    },
    repoContents: {
      'README.md': true,
      'docs': true,
      'examples': true,
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
      fetchPackage: jest.fn().mockResolvedValue(undefined),
      getRawData: jest.fn().mockReturnValue(mockGitHubRawData),
    };

    MockedNpmCollector.mockImplementation(() => mockNpmInstance as any);
    MockedGitHubCollector.mockImplementation(() => mockGitHubInstance as any);

    const result = await collectPackageData('test-package');

    expect(mockNpmInstance.fetchPackage).toHaveBeenCalledWith('test-package');
    expect(mockGitHubInstance.fetchPackage).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'cdklabs',
        repo: 'repo',
      }),
    );

    expect(result).toEqual({
      version: '1.0.0',
      weeklyDownloads: 10000,
      githubStars: 500,
      documentationCompleteness: {
        hasReadme: true,
        hasApiDocs: true,
        hasExamples: true,
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
      fetchPackage: jest.fn().mockRejectedValue(new Error('GitHub API error')),
      getRawData: jest.fn().mockReturnValue({
        repoData: { stargazers_count: 0 },
        repoContents: {},
        readmeContent: null,
      }),
    };

    MockedNpmCollector.mockImplementation(() => mockNpmInstance as any);
    MockedGitHubCollector.mockImplementation(() => mockGitHubInstance as any);

    const result = await collectPackageData('test-package');

    // expect(console.warn).toHaveBeenCalledWith('GitHub fetch failed: Error: GitHub API error');

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