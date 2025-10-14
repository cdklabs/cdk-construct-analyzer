import * as fs from 'fs';
import { ConstructAnalyzer } from '../../src/lib/analyzer';
import { collectPackageData } from '../../src/lib/data/collect';
import * as signalsModule from '../../src/lib/signals/index';

// Mock dependencies
jest.mock('fs');
jest.mock('../../src/lib/data/collect');
jest.mock('../../src/lib/signals/index');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedCollectPackageData = collectPackageData as jest.MockedFunction<typeof collectPackageData>;
const mockedSignalsModule = signalsModule as jest.Mocked<typeof signalsModule>;

describe('ConstructAnalyzer', () => {
  const mockConfig = {
    signals: {
      weekly_downloads: {
        pillar: 'POPULARITY',
        weight: 3.0,
        enabled: true,
        description: 'Weekly download count from npm',
      },
      github_stars: {
        pillar: 'POPULARITY',
        weight: 2.0,
        enabled: true,
        description: 'GitHub repository stars',
      },
      disabled_signal: {
        pillar: 'POPULARITY',
        weight: 1.0,
        enabled: false,
        description: 'This signal is disabled',
      },
    },
  };

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
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
  });

  it('should load config from file', () => {
    new ConstructAnalyzer();
    expect(mockedFs.readFileSync).toHaveBeenCalledWith('src/lib/config.json', 'utf8');
  });

  describe('analyzePackage', () => {
    it('should analyze package and return score result', async () => {
      mockedCollectPackageData.mockResolvedValue(mockPackageData as any);

      mockedSignalsModule.calculateWeeklyDownloads.mockResolvedValue(4); // 4 stars = 75 points
      mockedSignalsModule.calculateGithubStars.mockResolvedValue(3); // 3 stars = 50 points

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

      mockedSignalsModule.calculateWeeklyDownloads.mockResolvedValue(5); // 5 stars = 100 points
      mockedSignalsModule.calculateGithubStars.mockResolvedValue(3); // 3 stars = 50 points

      const analyzer = new ConstructAnalyzer();
      const result = await analyzer.analyzePackage('test-package');

      // With weights 3.0 and 2.0, and scores 100 and 50:
      // Weighted sum = (100 * 3.0) + (50 * 2.0) = 300 + 100 = 400
      // Total weight = 3.0 + 2.0 = 5.0
      // Normalized score = 400 / 5.0 = 80
      expect(result.pillarScores.POPULARITY).toBe(80);
    });

    it('should calculate total score as average of pillar scores', async () => {
      const configWithMultiplePillars = {
        signals: {
          weekly_downloads: { pillar: 'PILLAR1', weight: 1.0, enabled: true, description: 'Test' },
          github_stars: { pillar: 'PILLAR2', weight: 1.0, enabled: true, description: 'Test' },
        },
        pillars: {
          PILLAR1: { name: 'Pillar 1', weight: 1.0, description: 'Test pillar 1' },
          PILLAR2: { name: 'Pillar 2', weight: 1.0, description: 'Test pillar 2' },
        },
      };

      mockedFs.readFileSync.mockReturnValue(JSON.stringify(configWithMultiplePillars));
      mockedCollectPackageData.mockResolvedValue(mockPackageData as any);

      mockedSignalsModule.calculateWeeklyDownloads.mockResolvedValue(5); // 100 points
      mockedSignalsModule.calculateGithubStars.mockResolvedValue(3); // 50 points

      const analyzer = new ConstructAnalyzer();
      const result = await analyzer.analyzePackage('test-package');

      // Total score should be average of pillar scores: (100 + 50) / 2 = 75
      expect(result.totalScore).toBe(75);
    });

    it('should handle empty pillars gracefully', async () => {
      const configWithNoPillars = {
        signals: {},
        pillars: {},
      };

      mockedFs.readFileSync.mockReturnValue(JSON.stringify(configWithNoPillars));
      mockedCollectPackageData.mockResolvedValue(mockPackageData as any);

      const analyzer = new ConstructAnalyzer();
      const result = await analyzer.analyzePackage('test-package');

      expect(result.totalScore).toBe(0);
      expect(Object.keys(result.pillarScores)).toHaveLength(0);
      expect(Object.keys(result.signalScores)).toHaveLength(0);
    });
  });
});