import { cli } from '../../src/lib';
import { ConstructAnalyzer } from '../../src/lib/analyzer';

// Mock the analyzer
jest.mock('../../src/lib/analyzer');
const MockedConstructAnalyzer = ConstructAnalyzer as jest.MockedClass<typeof ConstructAnalyzer>;

// Mock console methods
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(),
  error: jest.spyOn(console, 'error').mockImplementation(),
};

// Mock process.exit
const processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
  return undefined as never;
});

describe('CLI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset process.argv
    process.argv = ['node', 'script'];
  });

  afterAll(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
    processExitSpy.mockRestore();
  });

  test('should analyze package and display basic results without verbose flag', async () => {
    const mockResult = {
      packageName: 'test-package',
      version: '1.0.0',
      totalScore: 85,
      pillarScores: {
        MAINTENANCE: 73,
        QUALITY: 90,
        POPULARITY: 88,
      },
      signalScores: {
        MAINTENANCE: {
          'numberOfContributors(Maintenance)': 4,
        },
        QUALITY: {
          documentationCompleteness: 5,
        },
        POPULARITY: {
          'weeklyDownloads': 4,
          'githubStars': 5,
          'numberOfContributors(Popularity)': 4,
        },
      },
    };

    const mockAnalyzePackage = jest.fn().mockResolvedValue(mockResult);
    MockedConstructAnalyzer.mockImplementation(() => ({
      analyzePackage: mockAnalyzePackage,
    } as any));

    // Set up argv for the command
    process.argv = ['node', 'script', 'test-package', '--verbose'];

    // Wait for CLI to complete
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        cli();
        resolve();
      }, 0);
    });

    // Wait a bit more for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockAnalyzePackage).toHaveBeenCalledWith('test-package');

    expect(consoleSpy.log).toHaveBeenCalledWith('\nLIBRARY: test-package');
    expect(consoleSpy.log).toHaveBeenCalledWith('VERSION: 1.0.0');
    expect(consoleSpy.log).toHaveBeenCalledWith('\nOVERALL SCORE: 85/100');

    expect(consoleSpy.log).toHaveBeenCalledWith('\n---');
    expect(consoleSpy.log).toHaveBeenCalledWith('\nSUBSCORES');
    expect(consoleSpy.log).toHaveBeenCalledWith('  MAINTENANCE :           73/100');
    expect(consoleSpy.log).toHaveBeenCalledWith('  QUALITY     :           90/100');
    expect(consoleSpy.log).toHaveBeenCalledWith('  POPULARITY  :           88/100');

    expect(consoleSpy.log).toHaveBeenCalledWith('\n---');

    expect(consoleSpy.log).toHaveBeenCalledWith('\n=== MAINTENANCE ===                                   SCORE  WEIGHT');
    expect(consoleSpy.log).toHaveBeenCalledWith('— Number Of Contributors (Maintenance) .............. ★★★★☆    2');

    expect(consoleSpy.log).toHaveBeenCalledWith('\n=== QUALITY ===                                       SCORE  WEIGHT');
    expect(consoleSpy.log).toHaveBeenCalledWith('— Documentation Completeness ........................ ★★★★★    3');

    expect(consoleSpy.log).toHaveBeenCalledWith('\n=== POPULARITY ===                                    SCORE  WEIGHT');
    expect(consoleSpy.log).toHaveBeenCalledWith('— Weekly Downloads .................................. ★★★★☆    3');
    expect(consoleSpy.log).toHaveBeenCalledWith('— Github Stars ...................................... ★★★★★    2');
    expect(consoleSpy.log).toHaveBeenCalledWith('— Number Of Contributors (Popularity) ............... ★★★★☆    1');
  });

  test('should handle analyzer errors gracefully', async () => {
    const mockError = new Error('Package not found');
    const mockAnalyzePackage = jest.fn().mockRejectedValue(mockError);
    MockedConstructAnalyzer.mockImplementation(() => ({
      analyzePackage: mockAnalyzePackage,
    } as any));

    process.argv = ['node', 'script', 'invalid-package'];

    // Wait for CLI to complete
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        cli();
        resolve();
      }, 0);
    });

    // Wait a bit more for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(consoleSpy.error).toHaveBeenCalledWith('Error:', 'Package not found');
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  test('should handle non-Error exceptions', async () => {
    const mockAnalyzePackage = jest.fn().mockRejectedValue('String error');
    MockedConstructAnalyzer.mockImplementation(() => ({
      analyzePackage: mockAnalyzePackage,
    } as any));

    process.argv = ['node', 'script', 'test-package'];

    // Wait for CLI to complete
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        cli();
        resolve();
      }, 0);
    });

    // Wait a bit more for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(consoleSpy.error).toHaveBeenCalledWith('Error:', 'String error');
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});