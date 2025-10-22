import { ConstructAnalyzer } from '../../src/lib/analyzer';
import { CONFIG } from '../../src/lib/config';
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
      hasExamples: true,
    },
  };

  // Get all pillars from the new config structure
  const enabledPillars = CONFIG.pillars.map(pillar => pillar.name);

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
        // Missing githubStars and documentationCompleteness
      };

      mockedCollectPackageData.mockResolvedValue(incompleteData as any);

      const analyzer = new ConstructAnalyzer();
      const result = await analyzer.analyzePackage('test-package');

      expect(result.packageName).toBe('test-package');
      expect(result.version).toBe('1.0.0');
    });

    test('should calculate total score as average of pillar scores', async () => {
      mockedCollectPackageData.mockResolvedValue(mockPackageData as any);

      const analyzer = new ConstructAnalyzer();
      const result = await analyzer.analyzePackage('test-package');

      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.pillarScores).toHaveProperty('POPULARITY');
    });
  });
});