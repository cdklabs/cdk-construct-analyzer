import { ConstructAnalyzer } from '../../src/lib/analyzer';
import { CONFIG } from '../../src/lib/config';
import { collectPackageData } from '../../src/lib/data/collect';

// Mock dependencies
jest.mock('../../src/lib/data/collect');

const mockedCollectPackageData = collectPackageData as jest.MockedFunction<typeof collectPackageData>;

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

    test('should include all enabled pillars', async () => {
      mockedCollectPackageData.mockResolvedValue(mockPackageData as any);

      const analyzer = new ConstructAnalyzer();
      const result = await analyzer.analyzePackage('test-package');

      enabledPillars.forEach(pillar => {
        expect(result.pillarScores).toHaveProperty(pillar);
        expect(result.signalScores).toHaveProperty(pillar);
        expect(Number.isInteger(result.pillarScores[pillar])).toBe(true);
        expect(result.pillarScores[pillar]).toBeGreaterThanOrEqual(0);
        expect(result.pillarScores[pillar]).toBeLessThanOrEqual(100);
      });
    });

    test('should include expected signals for each pillar', async () => {
      mockedCollectPackageData.mockResolvedValue(mockPackageData as any);

      const analyzer = new ConstructAnalyzer();
      const result = await analyzer.analyzePackage('test-package');

      // Check that each pillar has its expected signals
      CONFIG.pillars.forEach(pillar => {
        expect(result.signalScores).toHaveProperty(pillar.name);

        pillar.signals.forEach(signal => {
          expect(result.signalScores[pillar.name]).toHaveProperty(signal.name);
          const signalScore = result.signalScores[pillar.name][signal.name];
          expect(signalScore).toBeGreaterThanOrEqual(1);
          expect(signalScore).toBeLessThanOrEqual(5);
        });
      });
    });
  });
});