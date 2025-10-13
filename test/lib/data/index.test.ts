import { collectPackageData } from '../../../src/lib/data';
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

  it('should collect data from npm and github successfully', async () => {
    const mockNpmInstance = {
      fetchAll: jest.fn().mockResolvedValue(undefined),
      getPackageData: jest.fn().mockReturnValue(mockNpmData),
      getDownloadData: jest.fn().mockResolvedValue(mockDownloadData),
    };

    const mockGitHubInstance = {
      fetchAll: jest.fn().mockResolvedValue(undefined),
      getData: jest.fn().mockReturnValue(mockGitHubData),
    };

    MockedNpmCollector.mockImplementation(() => mockNpmInstance as any);
    MockedGitHubCollector.mockImplementation(() => mockGitHubInstance as any);

    const result = await collectPackageData('test-package');

    expect(mockNpmInstance.fetchAll).toHaveBeenCalledWith('test-package');
    expect(mockGitHubInstance.fetchAll).toHaveBeenCalledWith('https://github.com/test/repo');

    expect(result).toEqual({
      npm: mockNpmData,
      downloads: mockDownloadData,
      github: mockGitHubData,
    });
  });

  it('should handle missing repository URL', async () => {
    const npmDataWithoutRepo = {
      name: 'test-package',
      version: '1.0.0',
      repository: undefined,
    };

    const mockNpmInstance = {
      fetchAll: jest.fn().mockResolvedValue(undefined),
      getPackageData: jest.fn().mockReturnValue(npmDataWithoutRepo),
      getDownloadData: jest.fn().mockResolvedValue(mockDownloadData),
    };

    const mockGitHubInstance = {
      fetchAll: jest.fn().mockResolvedValue(undefined),
      getData: jest.fn().mockReturnValue({ stars: 0 }),
    };

    MockedNpmCollector.mockImplementation(() => mockNpmInstance as any);
    MockedGitHubCollector.mockImplementation(() => mockGitHubInstance as any);

    const result = await collectPackageData('test-package');

    expect(mockGitHubInstance.fetchAll).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('No repository URL found in NPM data');

    expect(result).toEqual({
      npm: npmDataWithoutRepo,
      downloads: mockDownloadData,
      github: { stars: 0 },
    });
  });

  it('should handle github fetch errors gracefully', async () => {
    const mockNpmInstance = {
      fetchAll: jest.fn().mockResolvedValue(undefined),
      getPackageData: jest.fn().mockReturnValue(mockNpmData),
      getDownloadData: jest.fn().mockResolvedValue(mockDownloadData),
    };

    const mockGitHubInstance = {
      fetchAll: jest.fn().mockRejectedValue(new Error('GitHub API error')),
      getData: jest.fn().mockReturnValue({ stars: 0 }),
    };

    MockedNpmCollector.mockImplementation(() => mockNpmInstance as any);
    MockedGitHubCollector.mockImplementation(() => mockGitHubInstance as any);

    const result = await collectPackageData('test-package');

    expect(console.warn).toHaveBeenCalledWith('GitHub fetch failed: Error: GitHub API error');

    expect(result).toEqual({
      npm: mockNpmData,
      downloads: mockDownloadData,
      github: { stars: 0 },
    });
  });


});