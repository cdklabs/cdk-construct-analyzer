import { NpmCollector } from '../../../src/lib/data/npm';

// Mock fetch globally
global.fetch = jest.fn();
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('NpmCollector', () => {
  let collector: NpmCollector;

  beforeEach(() => {
    collector = new NpmCollector();
    jest.clearAllMocks();
  });

  describe('fetchAll', () => {
    it('should fetch package data successfully', async () => {
      const mockResponse = {
        'name': 'test-package',
        'dist-tags': { latest: '1.0.0' },
        'repository': {
          type: 'git',
          url: 'https://github.com/test/repo',
        },
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await collector.fetchAll('test-package');

      expect(mockedFetch).toHaveBeenCalledWith('https://registry.npmjs.org/test-package');
    });

    it('should handle API errors', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(collector.fetchAll('nonexistent-package')).rejects.toThrow(
        'NPM registry returned 404: Not Found',
      );
    });

    it('should handle network errors', async () => {
      mockedFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(collector.fetchAll('test-package')).rejects.toThrow('Network error');
    });
  });

  describe('getPackageData', () => {
    it('should return package data after fetchAll', async () => {
      const mockResponse = {
        'name': 'test-package',
        'dist-tags': { latest: '1.0.0' },
        'repository': {
          type: 'git',
          url: 'https://github.com/test/repo',
        },
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await collector.fetchAll('test-package');
      const result = collector.getPackageData();

      expect(result).toEqual({
        name: 'test-package',
        version: '1.0.0',
        repository: {
          type: 'git',
          url: 'https://github.com/test/repo',
        },
      });
    });

    it('should throw error if fetchAll not called first', () => {
      expect(() => collector.getPackageData()).toThrow('Must call fetchAll() first');
    });


  });

  describe('getDownloadData', () => {
    it('should fetch download data successfully', async () => {
      // First mock the package fetch
      const mockPackageResponse = {
        'name': 'test-package',
        'dist-tags': { latest: '1.0.0' },
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPackageResponse,
      } as Response);

      await collector.fetchAll('test-package');

      // Then mock the downloads fetch
      const mockDownloadResponse = {
        downloads: 10000,
        start: '2023-01-01',
        end: '2023-01-07',
        package: 'test-package',
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDownloadResponse,
      } as Response);

      const result = await collector.getDownloadData();

      expect(mockedFetch).toHaveBeenCalledWith(
        'https://api.npmjs.org/downloads/point/last-week/test-package',
      );
      expect(result).toEqual(mockDownloadResponse);
    });

    it('should throw error if fetchAll not called first', async () => {
      await expect(collector.getDownloadData()).rejects.toThrow('Must call fetchAll() first');
    });

    it('should handle download API errors', async () => {
      // First fetch package data
      const mockPackageResponse = {
        'name': 'test-package',
        'dist-tags': { latest: '1.0.0' },
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPackageResponse,
      } as Response);

      await collector.fetchAll('test-package');

      // Then mock download API error
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(collector.getDownloadData()).rejects.toThrow(
        'NPM downloads API returned 500: Internal Server Error',
      );
    });
  });
});