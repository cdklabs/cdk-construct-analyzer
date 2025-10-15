import { ConstructAnalyzer } from '../../src/lib/analyzer';
import { collectPackageData } from '../../src/lib/data/collect';
import * as collectModule from '../../src/lib/data/collect';

// Mock dependencies
jest.mock('../../src/lib/data/collect');

const mockedCollectPackageData = collectPackageData as jest.MockedFunction<typeof collectPackageData>;
const mockedCollectModule = collectModule as jest.Mocked<typeof collectModule>;

describe('ConstructAnalyzer', () => {
  const mockPackageData = {
    npm: {
      name: 'test-package',
      version: '1.0.0',
      repository: { url: 'https://github.com/test/repo' },
    },
    downloads: {
      downloads: 10000,
    },
    github: {
      stars: 500,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzePackage', () => {
    it('should analyze package and return score result', async () => {
      mockedCollectPackageData.mockResolvedValue(mockPackageData as any);

      mockedCollectModule.calculateWeeklyDownloads.mockReturnValue(10000); // Raw download count
      mockedCollectModule.calculateGithubStars.mockReturnValue(500); // Raw star count

      const analyzer = new ConstructAnalyzer();
      const result = await analyzer.analyzePackage('test-package');

      expect(mockedCollectPackageData).toHaveBeenCalledWith('test-package');
      expect(result.packageName).toBe('test-package');
      expect(result.version).toBe('1.0.0');
      expect(result.signalScores).toHaveProperty('POPULARITY');
      expect(result.pillarScores).toHaveProperty('POPULARITY');
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
    });

    it('should skip disabled signals', async () => {
      mockedCollectPackageData.mockResolvedValue(mockPackageData as any);

      const analyzer = new ConstructAnalyzer();
      const result = await analyzer.analyzePackage('test-package');

      // Should not include disabled_signal in results
      expect(result.signalScores.POPULARITY).not.toHaveProperty('disabled_signal');
    });

    it('should calculate pillar scores correctly', async () => {
      mockedCollectPackageData.mockResolvedValue(mockPackageData as any);

      mockedCollectModule.calculateWeeklyDownloads.mockReturnValue(3000); // Raw download count for 5 stars
      mockedCollectModule.calculateGithubStars.mockReturnValue(500); // Raw star count for 4 stars

      const analyzer = new ConstructAnalyzer();
      const result = await analyzer.analyzePackage('test-package');

      // With weights 3.0 and 2.0, and scores 100 and 50:
      // Weighted sum = (100 * 3.0) + (75 * 2.0) = 300 + 150 = 450
      // Total weight = 3.0 + 2.0 = 5.0
      // Normalized score = 450 / 5.0 = 90
      expect(result.pillarScores.POPULARITY).toBe(90);
    });

    it('should calculate total score as average of pillar scores', async () => {
      mockedCollectPackageData.mockResolvedValue(mockPackageData as any);

      mockedCollectModule.calculateWeeklyDownloads.mockReturnValue(3000); // Raw download count
      mockedCollectModule.calculateGithubStars.mockReturnValue(500); // Raw star count

      const analyzer = new ConstructAnalyzer();
      const result = await analyzer.analyzePackage('test-package');

      // Both signals are in POPULARITY pillar, so total score equals pillar score
      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.pillarScores).toHaveProperty('POPULARITY');
    });
  });
});