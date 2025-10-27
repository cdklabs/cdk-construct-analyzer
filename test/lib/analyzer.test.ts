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
        // Missing a few other signals
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
  });
});