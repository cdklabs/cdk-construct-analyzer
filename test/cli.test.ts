import { cli } from '../src';

// Mock console.log to capture output
const mockConsoleLog = jest.fn();
console.log = mockConsoleLog;

// Mock process.argv for yargs
const originalArgv = process.argv;

describe('CLI', () => {
  beforeEach(() => {
    // Clear mock calls before each test
    mockConsoleLog.mockClear();
    // Set up minimal argv for yargs
    process.argv = ['node', 'cli'];
  });

  afterEach(() => {
    // Restore original argv
    process.argv = originalArgv;
  });

  it('should print Hello World!', async () => {
    // Call the CLI function (now async)
    await cli();

    // Wait a bit for yargs to process (it's async)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check that console.log was called with "Hello World!"
    expect(mockConsoleLog).toHaveBeenCalledWith('Hello World!');
  });
});