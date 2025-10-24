import { collectPackageData, extractRepoInfo, processContributorsData, isBotOrAutomated } from '../../../src/lib/data/collect';
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
    hasProvenance: true,
  };

  const mockDownloadData = {
    downloads: 10000,
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
      commits: [
        {
          author: { user: { login: 'user1' }, email: 'user1@example.com' },
          committedDate: '2024-10-01T00:00:00Z',
        },
        {
          author: { user: { login: 'user2' }, email: 'user2@example.com' },
          committedDate: '2024-10-02T00:00:00Z',
        },
      ],
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
      'version': '1.0.0',
      'numberOfContributors(Maintenance)': 2,
      'documentationCompleteness': {
        hasReadme: true,
        hasApiDocs: true,
        hasExample: true,
        multipleExamples: true,
      },
      'weeklyDownloads': 10000,
      'githubStars': 500,
      'numberOfContributors(Popularity)': 2,
      'provenanceVerification': true,
    });
  });

  test('should handle github fetch errors gracefully', async () => {
    const mockNpmInstance = {
      fetchPackage: jest.fn().mockResolvedValue(undefined),
      getPackageData: jest.fn().mockReturnValue(mockNpmData),
      fetchDownloadData: jest.fn().mockResolvedValue(mockDownloadData),
    };

    const mockGitHubInstance = {
      metadata: jest.fn().mockRejectedValue(new Error('GitHub API error')),
    };

    MockedNpmCollector.mockImplementation(() => mockNpmInstance as any);
    MockedGitHubRepo.mockImplementation(() => mockGitHubInstance as any);

    const result = await collectPackageData('test-package');

    expect(console.warn).toHaveBeenCalledWith('GitHub fetch failed: Error: GitHub API error');

    expect(result).toEqual({
      version: '1.0.0',
      weeklyDownloads: 10000,
      provenanceVerification: true,
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
          author: { user: { login: 'user1' } },
        },
        {
          author: { user: { login: 'user2' } },
        },
      ];

      expect(processContributorsData(contributorsData)).toBe(2);
    });

    test('should exclude bots from count', () => {
      const contributorsData = [
        {
          author: { user: { login: 'user1' } },
        },
        {
          author: { user: { login: 'dependabot[bot]' } },
        },
        {
          author: { user: { login: 'github-actions[bot]' } },
        },
      ];

      expect(processContributorsData(contributorsData)).toBe(1);
    });

    test('should handle email-only authors', () => {
      const contributorsData = [
        {
          author: { email: 'user1@example.com' },
        },
        {
          author: { user: { login: 'user2' } },
        },
      ];

      expect(processContributorsData(contributorsData)).toBe(2);
    });

    test('should not count duplicate contributors', () => {
      const contributorsData = [
        {
          author: { user: { login: 'user1' } },
        },
        {
          author: { user: { login: 'user1' } },
        },
      ];

      expect(processContributorsData(contributorsData)).toBe(1);
    });

    test('should exclude bot emails', () => {
      const contributorsData = [
        {
          author: { email: 'user@example.com' },
        },
        {
          author: { email: 'dependabot[bot]@users.noreply.github.com' },
        },
        {
          author: { user: { login: 'user3' } },
        },
      ];

      expect(processContributorsData(contributorsData)).toBe(2);
    });
  });

  describe('isBotOrAutomated', () => {
    describe('bot username patterns', () => {
      test('should detect [bot] suffix', () => {
        expect(isBotOrAutomated('dependabot[bot]')).toBe(true);
        expect(isBotOrAutomated('github-actions[bot]')).toBe(true);
      });

      test('should detect bot suffix', () => {
        expect(isBotOrAutomated('renovatebot')).toBe(true);
        expect(isBotOrAutomated('greenkeeper-bot')).toBe(true);
      });

      test('should detect automation prefix', () => {
        expect(isBotOrAutomated('automation-user')).toBe(true);
        expect(isBotOrAutomated('Automation-Service')).toBe(true);
      });

      test('should not flag normal usernames', () => {
        expect(isBotOrAutomated('john-doe')).toBe(false);
        expect(isBotOrAutomated('contributor123')).toBe(false);
        expect(isBotOrAutomated('user-name')).toBe(false);
      });
    });


    test('should handle empty inputs', () => {
      expect(isBotOrAutomated('')).toBe(false);
    });

    test('should be case insensitive', () => {
      expect(isBotOrAutomated('DEPENDABOT[BOT]')).toBe(true);
      expect(isBotOrAutomated('AUTOMATION-USER')).toBe(true);
    });
  });
});