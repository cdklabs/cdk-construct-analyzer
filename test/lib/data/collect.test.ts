import { collectPackageData } from '../../../src/library/data/collect';
import { GitHubRepo } from '../../../src/library/data/github-repo';
import { NpmCollector } from '../../../src/library/data/npm';
import { pinSystemTime } from '../../util';

// Mock the collectors
jest.mock('../../../src/library/data/npm');
jest.mock('../../../src/library/data/github-repo');

const MockedNpmCollector = NpmCollector as jest.MockedClass<typeof NpmCollector>;
const MockedGitHubRepo = GitHubRepo as jest.MockedClass<typeof GitHubRepo>;

describe('collectPackageData', () => {
  // Release signals count a trailing year from the current time, so pin the
  // clock to keep the absolute dates below inside the window
  pinSystemTime(new Date('2025-11-01T00:00:00Z'));

  const mockNpmData = {
    name: 'test-package',
    version: '1.0.0',
    repository: {
      url: 'https://github.com/cdklabs/repo',
    },
    isDeprecated: false,
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
      fetchAuthorPackageCount: jest.fn().mockResolvedValue(42),
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
      releases: [
        { publishedAt: '2025-10-01T00:00:00Z', tagName: 'v1.0.0', description: 'feat: add new dashboard\nfix: resolve login issue' },
        { publishedAt: '2025-09-01T00:00:00Z', tagName: 'v0.9.0', description: 'Minor updates and documentation' },
        { publishedAt: '2025-08-01T00:00:00Z', tagName: 'v0.8.0', description: 'Initial release' },
      ],
      openIssuesCount: 10,
      totalIssuesCount: 100,
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
      numberOfContributors_Maintenance: 2,
      documentationCompleteness: {
        hasReadme: true,
        hasApiDocs: true,
        hasExample: true,
        multipleExamples: true,
      },
      testsChecklist: {
        hasUnitTests: false,
        hasSnapshotTests: false,
      },
      authorPackageCount: 42,
      releaseNotesIncludeFeatsAndFixes: {
        hasFeats: true,
        hasFixes: true,
      },
      weeklyDownloads: 10000,
      githubStars: 500,
      numberOfContributors_Popularity: 2,
      numberOfFeatsAndFixes: 2,
      stableVersioning: {
        isStableMajorVersion: true,
        hasMinorReleases: false,
        isDeprecated: false,
      },
      provenanceVerification: true,
      releaseFrequency: 3,
      timeToFirstResponse: undefined,
      multiLanguageSupport: 0,
      openIssuesRatio: 10,
    });
  });

  test('should handle github fetch errors gracefully', async () => {
    const mockNpmInstance = {
      fetchPackage: jest.fn().mockResolvedValue(undefined),
      getPackageData: jest.fn().mockReturnValue(mockNpmData),
      fetchDownloadData: jest.fn().mockResolvedValue(mockDownloadData),
      fetchAuthorPackageCount: jest.fn().mockResolvedValue(42),
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
      authorPackageCount: 42,
      weeklyDownloads: 10000,
      stableVersioning: {
        isStableMajorVersion: true,
        hasMinorReleases: false,
        isDeprecated: false,
      },
      provenanceVerification: true,
      multiLanguageSupport: 0,
    });
  });
});