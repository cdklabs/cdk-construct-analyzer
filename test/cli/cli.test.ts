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

  test('should analyze package and display results', async () => {
    const mockResult = {
      packageName: 'test-package',
      version: '1.0.0',
      totalScore: 85.5,
      pillarScores: {
        POPULARITY: 42.3,
      },
      signalScores: {
        POPULARITY: {
          weeklyDownloads: 4.2,
          githubStars: 3.8,
        },
      },
    };

    const mockAnalyzePackage = jest.fn().mockResolvedValue(mockResult);
    MockedConstructAnalyzer.mockImplementation(() => ({
      analyzePackage: mockAnalyzePackage,
    } as any));

    // Set up argv for the command
    process.argv = ['node', 'script', 'test-package'];

    await cli();

    expect(mockAnalyzePackage).toHaveBeenCalledWith('test-package');
    expect(consoleSpy.log).toHaveBeenCalledWith('LIBRARY: test-package');
    expect(consoleSpy.log).toHaveBeenCalledWith('VERSION: 1.0.0');
    expect(consoleSpy.log).toHaveBeenCalledWith('\nOVERALL SCORE: 85.5/100');
    expect(consoleSpy.log).toHaveBeenCalledWith('  POPULARITY: 42.3');
    expect(consoleSpy.log).toHaveBeenCalledWith('  Weekly Downloads: 4.2');
    expect(consoleSpy.log).toHaveBeenCalledWith('  Github Stars: 3.8');
  });

  test('should handle analyzer errors gracefully', async () => {
    const mockError = new Error('Package not found');
    const mockAnalyzePackage = jest.fn().mockRejectedValue(mockError);
    MockedConstructAnalyzer.mockImplementation(() => ({
      analyzePackage: mockAnalyzePackage,
    } as any));

    process.argv = ['node', 'script', 'invalid-package'];

    await cli();

    expect(consoleSpy.error).toHaveBeenCalledWith('Error:', 'Package not found');
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  test('should handle non-Error exceptions', async () => {
    const mockAnalyzePackage = jest.fn().mockRejectedValue('String error');
    MockedConstructAnalyzer.mockImplementation(() => ({
      analyzePackage: mockAnalyzePackage,
    } as any));

    process.argv = ['node', 'script', 'test-package'];

    await cli();

    expect(consoleSpy.error).toHaveBeenCalledWith('Error:', 'String error');
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});