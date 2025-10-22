import { collectPackageData, extractRepoInfo, processContributorsData, isBotOrAutomated } from '../../../src/lib/data/collect';
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
    contributorsData: [
      {
        author: { login: 'user1' },
        committer: { login: 'user1' },
        commit: { message: 'Add new feature' },
      },
      {
        author: { login: 'user2' },
        committer: { login: 'user2' },
        commit: { message: 'Fix bug' },
      },
      {
        author: { login: 'dependabot[bot]' },
        committer: { login: 'dependabot[bot]' },
        commit: { message: 'chore(deps): bump version' },
      },
    ],
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
      fetchDownloadData: jest.fn().mockResolvedValue(mockDownloadData),
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
      numberOfContributorsMaintenance: 2,
      documentationCompleteness: {
        hasReadme: true,
        hasApiDocs: true,
        hasExample: true,
        multipleExamples: true,
      },
      weeklyDownloads: 10000,
      githubStars: 500,
      numberOfContributorsPopularity: 2,
    });
  });

  test('should handle github fetch errors gracefully', async () => {
    const mockNpmInstance = {
      fetchPackage: jest.fn().mockResolvedValue(undefined),
      getPackageData: jest.fn().mockReturnValue(mockNpmData),
      fetchDownloadData: jest.fn().mockResolvedValue(mockDownloadData),
    };

    const mockGitHubInstance = {
      fetchPackage: jest.fn().mockRejectedValue(new Error('GitHub API error')),
      getRawData: jest.fn().mockReturnValue({
        repoData: { stargazers_count: 0 },
        repoContents: {},
      }),
    };

    MockedNpmCollector.mockImplementation(() => mockNpmInstance as any);
    MockedGitHubCollector.mockImplementation(() => mockGitHubInstance as any);

    const result = await collectPackageData('test-package');

    expect(console.warn).toHaveBeenCalledWith('GitHub fetch failed: Error: GitHub API error');

    expect(result).toEqual({
      version: '1.0.0',
      weeklyDownloads: 10000,
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

  describe('processContributorsData', () => {
    test('should return 0 for undefined data', () => {
      expect(processContributorsData(undefined)).toBe(0);
    });

    test('should return 0 for empty array', () => {
      expect(processContributorsData([])).toBe(0);
    });

    test('should count unique human contributors', () => {
      const contributorsData = [
        {
          author: { login: 'user1' },
          committer: { login: 'user1' },
          commit: { message: 'Add feature' },
        },
        {
          author: { login: 'user2' },
          committer: { login: 'user2' },
          commit: { message: 'Fix bug' },
        },
      ];

      expect(processContributorsData(contributorsData)).toBe(2);
    });

    test('should exclude bots from count', () => {
      const contributorsData = [
        {
          author: { login: 'user1' },
          committer: { login: 'user1' },
          commit: { message: 'Add feature' },
        },
        {
          author: { login: 'dependabot[bot]' },
          committer: { login: 'dependabot[bot]' },
          commit: { message: 'chore(deps): bump version' },
        },
        {
          author: { login: 'github-actions[bot]' },
          committer: { login: 'github-actions[bot]' },
          commit: { message: 'Update docs' },
        },
      ];

      expect(processContributorsData(contributorsData)).toBe(1);
    });

    test('should count both author and committer when different', () => {
      const contributorsData = [
        {
          author: { login: 'contributor' },
          committer: { login: 'maintainer' },
          commit: { message: 'Add feature' },
        },
      ];

      expect(processContributorsData(contributorsData)).toBe(2);
    });

    test('should not double-count same person as author and committer', () => {
      const contributorsData = [
        {
          author: { login: 'user1' },
          committer: { login: 'user1' },
          commit: { message: 'Add feature' },
        },
      ];

      expect(processContributorsData(contributorsData)).toBe(1);
    });

    test('should exclude automated commits by message pattern', () => {
      const contributorsData = [
        {
          author: { login: 'user1' },
          committer: { login: 'user1' },
          commit: { message: 'chore(deps): update dependencies' },
        },
        {
          author: { login: 'user2' },
          committer: { login: 'user2' },
          commit: { message: 'bump version to 1.2.3' },
        },
        {
          author: { login: 'user3' },
          committer: { login: 'user3' },
          commit: { message: 'Add real feature' },
        },
      ];

      expect(processContributorsData(contributorsData)).toBe(1);
    });
  });

  describe('isBotOrAutomated', () => {
    describe('bot username patterns', () => {
      test('should detect [bot] suffix', () => {
        expect(isBotOrAutomated('dependabot[bot]', 'normal message')).toBe(true);
        expect(isBotOrAutomated('github-actions[bot]', 'normal message')).toBe(true);
      });

      test('should detect bot suffix', () => {
        expect(isBotOrAutomated('renovatebot', 'normal message')).toBe(true);
        expect(isBotOrAutomated('greenkeeper-bot', 'normal message')).toBe(true);
      });

      test('should detect automation prefix', () => {
        expect(isBotOrAutomated('automation-user', 'normal message')).toBe(true);
        expect(isBotOrAutomated('Automation-Service', 'normal message')).toBe(true);
      });

      test('should not flag normal usernames', () => {
        expect(isBotOrAutomated('john-doe', 'normal message')).toBe(false);
        expect(isBotOrAutomated('contributor123', 'normal message')).toBe(false);
        expect(isBotOrAutomated('robot-lover', 'normal message')).toBe(false); // contains 'bot' but not at end
      });
    });

    describe('automated commit message patterns', () => {
      test('should detect dependency updates', () => {
        expect(isBotOrAutomated('user', 'chore(deps): update package')).toBe(true);
        expect(isBotOrAutomated('user', 'Chore(deps): bump version')).toBe(true);
      });

      test('should detect version bumps', () => {
        expect(isBotOrAutomated('user', 'bump version to 1.2.3')).toBe(true);
        expect(isBotOrAutomated('user', 'Bump Version 2.0.0')).toBe(true);
      });

      test('should detect dependency updates', () => {
        expect(isBotOrAutomated('user', 'update dependencies')).toBe(true);
        expect(isBotOrAutomated('user', 'Update Dependencies to latest')).toBe(true);
      });

      test('should detect auto-prefixed messages', () => {
        expect(isBotOrAutomated('user', 'auto: regenerate docs')).toBe(true);
        expect(isBotOrAutomated('user', 'Auto-update configuration')).toBe(true);
      });

      test('should not flag normal commit messages', () => {
        expect(isBotOrAutomated('user', 'Add new feature')).toBe(false);
        expect(isBotOrAutomated('user', 'Fix critical bug')).toBe(false);
        expect(isBotOrAutomated('user', 'Refactor authentication logic')).toBe(false);
        expect(isBotOrAutomated('user', 'Update README with examples')).toBe(false); // manual update
      });
    });

    test('should handle empty or undefined inputs', () => {
      expect(isBotOrAutomated('', '')).toBe(false);
      expect(isBotOrAutomated('user', '')).toBe(false);
      expect(isBotOrAutomated('', 'message')).toBe(false);
    });

    test('should be case insensitive', () => {
      expect(isBotOrAutomated('DEPENDABOT[BOT]', 'normal message')).toBe(true);
      expect(isBotOrAutomated('user', 'CHORE(DEPS): update')).toBe(true);
    });
  });
});