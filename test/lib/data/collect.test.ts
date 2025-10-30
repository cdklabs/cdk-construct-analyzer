import { collectPackageData } from '../../../src/lib/data/collect';
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
      'stableVersioning': {
        majorVersion: true,
        minorVersion: false,
        isDeprecated: false,
      },
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
      stableVersioning: {
        majorVersion: true,
        minorVersion: false,
        isDeprecated: false,
      },
      provenanceVerification: true,
    });
  });
});