import chalk from 'chalk';
import { cli } from '../../src/lib';
import { ConstructAnalyzer } from '../../src/library/analyzer';

// Disable chalk colors for testing
chalk.level = 0;

// Mock the analyzer
jest.mock('../../src/library/analyzer');
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

  test('should analyze package and display basic results without details flag', async () => {
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
          numberOfContributors_Maintenance: 4,
        },
        QUALITY: {
          documentationCompleteness: 5,
        },
        POPULARITY: {
          weeklyDownloads: 4,
          githubStars: 5,
          numberOfContributors_Popularity: 4,
        },
      },
      signalWeights: {
        MAINTENANCE: {
          numberOfContributors_Maintenance: 2,
        },
        QUALITY: {
          documentationCompleteness: 3,
        },
        POPULARITY: {
          weeklyDownloads: 3,
          githubStars: 2,
          numberOfContributors_Popularity: 1,
        },
      },
    };

    const mockAnalyzePackage = jest.fn().mockResolvedValue(mockResult);
    MockedConstructAnalyzer.mockImplementation(() => ({
      analyzePackage: mockAnalyzePackage,
    } as any));

    // Set up argv for the command
    process.argv = ['node', 'script', 'test-package', '--details'];

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

    // Verify basic output structure
    expect(consoleSpy.log).toHaveBeenCalled();

    // Check that key information was logged
    const allCalls = consoleSpy.log.mock.calls.map(call => call.join(' '));
    expect(allCalls.some(call => call.includes('test-package'))).toBe(true);
    expect(allCalls.some(call => call.includes('1.0.0'))).toBe(true);
    expect(allCalls.some(call => call.includes('85/100'))).toBe(true);
    expect(allCalls.some(call => call.includes('SUBSCORES'))).toBe(true);
    expect(allCalls.some(call => call.includes('MAINTENANCE'))).toBe(true);
    expect(allCalls.some(call => call.includes('QUALITY'))).toBe(true);
    expect(allCalls.some(call => call.includes('POPULARITY'))).toBe(true);

    // Check detailed output is present
    expect(allCalls.some(call => call.includes('Number Of Contributors - Maintenance'))).toBe(true);
    expect(allCalls.some(call => call.includes('Documentation Completeness'))).toBe(true);
    expect(allCalls.some(call => call.includes('Weekly Downloads'))).toBe(true);
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