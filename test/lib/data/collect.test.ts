import { collectPackageData } from '../../../src/lib/data/collect';
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
      url: 'https://github.com/test/repo',
    },
  };

  const mockDownloadData = {
    downloads: 10000,
  };

  const mockGitHubData = {
    stars: 500,
    hasReadme: true,
    hasApiDocs: true,
    hasExamples: true,
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
      getData: jest.fn().mockReturnValue(mockGitHubData),
    };

    MockedNpmCollector.mockImplementation(() => mockNpmInstance as any);
    MockedGitHubCollector.mockImplementation(() => mockGitHubInstance as any);

    const result = await collectPackageData('test-package');

    expect(mockNpmInstance.fetchPackage).toHaveBeenCalledWith('test-package');
    expect(mockGitHubInstance.fetchPackage).toHaveBeenCalledWith('https://github.com/test/repo');

    expect(result).toEqual({
      npm: mockNpmData,
      downloads: mockDownloadData,
      github: mockGitHubData,
    });
  });

  test('should handle missing repository URL', async () => {
    const npmDataWithoutRepo = {
      name: 'test-package',
      version: '1.0.0',
      repository: undefined,
    };

    const mockNpmInstance = {
      fetchPackage: jest.fn().mockResolvedValue(undefined),
      getPackageData: jest.fn().mockReturnValue(npmDataWithoutRepo),
      getDownloadData: jest.fn().mockResolvedValue(mockDownloadData),
    };

    const mockGitHubInstance = {
      fetchPackage: jest.fn().mockResolvedValue(undefined),
      getData: jest.fn().mockReturnValue({ stars: 0, hasReadme: false, hasApiDocs: false, hasExamples: false }),
    };

    MockedNpmCollector.mockImplementation(() => mockNpmInstance as any);
    MockedGitHubCollector.mockImplementation(() => mockGitHubInstance as any);

    const result = await collectPackageData('test-package');

    expect(mockGitHubInstance.fetchPackage).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('No repository URL found in NPM data');

    expect(result).toEqual({
      npm: npmDataWithoutRepo,
      downloads: mockDownloadData,
      github: { stars: 0, hasReadme: false, hasApiDocs: false, hasExamples: false },
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
      getData: jest.fn().mockReturnValue({ stars: 0, hasReadme: false, hasApiDocs: false, hasExamples: false }),
    };

    MockedNpmCollector.mockImplementation(() => mockNpmInstance as any);
    MockedGitHubCollector.mockImplementation(() => mockGitHubInstance as any);

    const result = await collectPackageData('test-package');

    expect(console.warn).toHaveBeenCalledWith('GitHub fetch failed: Error: GitHub API error');

    expect(result).toEqual({
      npm: mockNpmData,
      downloads: mockDownloadData,
      github: { stars: 0, hasReadme: false, hasApiDocs: false, hasExamples: false },
    });
  });


});