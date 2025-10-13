import { PackageData } from '../../../src/lib/data';
import { calculateWeeklyDownloads, calculateGithubStars } from '../../../src/lib/signals/popularity';

describe('Popularity Signals', () => {
  const createMockPackageData = (downloads: number, stars: number): PackageData => ({
    npm: {
      name: 'test-package',
      version: '1.0.0',
    },
    downloads: {
      downloads,
    },
    github: {
      stars,
    },
  });

  describe('calculateWeeklyDownloads', () => {
    it('should return 5 stars for downloads >= 2500', async () => {
      const packageData = createMockPackageData(2500, 0);
      const result = await calculateWeeklyDownloads(packageData);
      expect(result).toBe(5);
    });

    it('should return 4 stars for downloads >= 251', async () => {
      const packageData = createMockPackageData(251, 0);
      const result = await calculateWeeklyDownloads(packageData);
      expect(result).toBe(4);
    });

    it('should return 3 stars for downloads >= 41', async () => {
      const packageData = createMockPackageData(41, 0);
      const result = await calculateWeeklyDownloads(packageData);
      expect(result).toBe(3);
    });

    it('should return 2 stars for downloads >= 6', async () => {
      const packageData = createMockPackageData(6, 0);
      const result = await calculateWeeklyDownloads(packageData);
      expect(result).toBe(2);
    });

    it('should return 1 star for downloads < 6', async () => {
      const packageData = createMockPackageData(0, 0);
      const result = await calculateWeeklyDownloads(packageData);
      expect(result).toBe(1);
    });

    it('should handle undefined downloads', async () => {
      const packageData: PackageData = {
        npm: { name: 'test', version: '1.0.0' },
        downloads: { downloads: undefined as any },
        github: { stars: 0 },
      };
      const result = await calculateWeeklyDownloads(packageData);
      expect(result).toBe(1);
    });
  });

  describe('calculateGithubStars', () => {
    it('should return 5 stars for github stars >= 638', async () => {
      const packageData = createMockPackageData(0, 638);
      const result = await calculateGithubStars(packageData);
      expect(result).toBe(5);
    });

    it('should return 4 stars for github stars >= 28', async () => {
      const packageData = createMockPackageData(0, 28);
      const result = await calculateGithubStars(packageData);
      expect(result).toBe(4);
    });

    it('should return 3 stars for github stars >= 4', async () => {
      const packageData = createMockPackageData(0, 4);
      const result = await calculateGithubStars(packageData);
      expect(result).toBe(3);
    });

    it('should return 2 stars for github stars >= 1', async () => {
      const packageData = createMockPackageData(0, 1);
      const result = await calculateGithubStars(packageData);
      expect(result).toBe(2);
    });

    it('should return 1 star for github stars < 1', async () => {
      const packageData = createMockPackageData(0, 0);
      const result = await calculateGithubStars(packageData);
      expect(result).toBe(1);
    });

    it('should handle undefined github stars', async () => {
      const packageData: PackageData = {
        npm: { name: 'test', version: '1.0.0' },
        downloads: { downloads: 0 },
        github: { stars: undefined as any },
      };
      const result = await calculateGithubStars(packageData);
      expect(result).toBe(1);
    });
  });
});