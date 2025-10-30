import { ConstructAnalyzer } from '../../src/lib/analyzer';
import { collectPackageData } from '../../src/lib/data/collect';

// Mock dependencies
jest.mock('../../src/lib/data/collect');

const mockedCollectPackageData = collectPackageData as jest.MockedFunction<typeof collectPackageData>;

describe('ConstructAnalyzer', () => {
  const mockPackageData = {
    version: '1.0.0',
    weeklyDownloads: 10000,
    githubStars: 500,
    documentationCompleteness: {
      hasReadme: true,
      hasApiDocs: true,
      hasExample: true,
      multipleExamples: true,
    },
  };


  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzePackage', () => {
    test('should analyze package and return correct structure', async () => {
      mockedCollectPackageData.mockResolvedValue(mockPackageData as any);

      const analyzer = new ConstructAnalyzer();
      const result = await analyzer.analyzePackage('test-package');

      expect(result.packageName).toBe('test-package');
      expect(result.version).toBe('1.0.0');
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
      expect(Number.isInteger(result.totalScore)).toBe(true);
    });

    test('should handle missing signal data gracefully', async () => {
      const incompleteData = {
        version: '1.0.0',
        weeklyDownloads: 10000,
        documentationCompleteness: {
          hasReadme: true,
          hasApiDocs: true,
          hasExample: true,
          multipleExamples: true,
        },
        // Missing githubStars
      };

      mockedCollectPackageData.mockResolvedValue(incompleteData as any);

      const analyzer = new ConstructAnalyzer();
      const result = await analyzer.analyzePackage('test-package');

      expect(result.packageName).toBe('test-package');
      expect(result.version).toBe('1.0.0');
    });

    test('should calculate total score as weighted average of pillar scores', async () => {
      mockedCollectPackageData.mockResolvedValue(mockPackageData as any);

      const analyzer = new ConstructAnalyzer();
      const result = await analyzer.analyzePackage('test-package');

      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.pillarScores).toHaveProperty('POPULARITY');
      expect(result.pillarScores).toHaveProperty('QUALITY');

      // Verify that the total score is calculated using pillar weights
      // Since all pillars have equal weight (0.33), the result should be similar to a simple average
      const pillarValues = Object.values(result.pillarScores);
      const simpleAverage = Math.round(pillarValues.reduce((sum, score) => sum + score, 0) / pillarValues.length);
      expect(Math.abs(result.totalScore - simpleAverage)).toBeLessThanOrEqual(1); // Allow for rounding differences
    });

    test('should skip undefined signals and contribute 0 points', async () => {
      const dataWithUndefinedSignal = {
        version: '1.0.0',
        weeklyDownloads: 1000,
        documentationCompleteness: {
          hasReadme: true,
          hasApiDocs: true,
          hasExample: true,
          multipleExamples: true,
        },
        // githubStars: undefined (should also count as 0 points)
      };

      const dataWithAllSignals = {
        version: '1.0.0',
        weeklyDownloads: 1000,
        githubStars: 0, // 0 points
        documentationCompleteness: {
          hasReadme: true,
          hasApiDocs: true,
          hasExample: true,
          multipleExamples: true,
        },
      };

      mockedCollectPackageData.mockResolvedValueOnce(dataWithUndefinedSignal as any);
      const analyzer1 = new ConstructAnalyzer();
      const resultWithMissing = await analyzer1.analyzePackage('test-package');

      mockedCollectPackageData.mockResolvedValueOnce(dataWithAllSignals as any);
      const analyzer2 = new ConstructAnalyzer();
      const resultWithAll = await analyzer2.analyzePackage('test-package');

      // The result with undefined signals should have equal scores
      // because undefined signals contribute as 0 points
      expect(resultWithMissing.totalScore).toEqual(resultWithAll.totalScore);
    });

    test('should use custom weights when provided', async () => {
      mockedCollectPackageData.mockResolvedValue(mockPackageData as any);

      const analyzer = new ConstructAnalyzer();

      // First, get result with default weights
      const defaultResult = await analyzer.analyzePackage('test-package');

      // Then, get result with custom weights that heavily favor weeklyDownloads
      const customWeights = {
        weeklyDownloads: 10, // Much higher than default
        githubStars: 1, // Much lower than default
      };

      const customResult = await analyzer.analyzePackage('test-package', customWeights);

      // Verify that custom weights are reflected in the result
      expect(customResult.signalWeights.POPULARITY.weeklyDownloads).toBe(10);
      expect(customResult.signalWeights.POPULARITY.githubStars).toBe(1);

      // The scores should be different due to different weights
      expect(customResult.pillarScores.POPULARITY).not.toBe(defaultResult.pillarScores.POPULARITY);
    });

    test('should fall back to default weights for missing custom weights', async () => {
      mockedCollectPackageData.mockResolvedValue(mockPackageData as any);

      const analyzer = new ConstructAnalyzer();

      // Provide partial custom weights (only for some signals)
      const partialCustomWeights = {
        weeklyDownloads: 5, // Custom weight
        // githubStars: missing, should use default
        // documentationCompleteness: missing, should use default
      };

      const result = await analyzer.analyzePackage('test-package', partialCustomWeights);

      // Should use custom weight for weeklyDownloads
      expect(result.signalWeights.POPULARITY.weeklyDownloads).toBe(5);

      // Should use default weight for githubStars (which is 2 from config)
      expect(result.signalWeights.POPULARITY.githubStars).toBe(2);

      // Should use default weights for all QUALITY signals
      expect(result.signalWeights.QUALITY).toBeDefined();
    });
  });
});