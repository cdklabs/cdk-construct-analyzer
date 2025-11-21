import type { GitHubRepository } from '../../../src/library/types';
import { analyzeTestsPresence } from '../../../src/library/utils/tests';

describe('analyzeTestsPresence', () => {
  test('should detect unit tests from test directory', () => {
    const repository: GitHubRepository = {
      stargazerCount: 100,
      rootContents: {
        entries: [
          {
            name: 'test',
            type: 'tree',
            object: {
              entries: [
                { name: 'index.test.ts', type: 'blob' },
                { name: 'utils.test.js', type: 'blob' },
              ],
            },
          },
          { name: 'src', type: 'tree' },
          { name: 'package.json', type: 'blob' },
        ],
      },
    };

    const result = analyzeTestsPresence(repository);
    expect(result.hasUnitTests).toBe(true);
  });

  test('should detect unit tests from tests directory', () => {
    const repository: GitHubRepository = {
      stargazerCount: 100,
      rootContents: {
        entries: [
          {
            name: 'tests',
            type: 'tree',
            object: {
              entries: [
                { name: 'component.spec.ts', type: 'blob' },
              ],
            },
          },
          { name: 'src', type: 'tree' },
        ],
      },
    };

    const result = analyzeTestsPresence(repository);
    expect(result.hasUnitTests).toBe(true);
  });

  test('should detect unit tests from __tests__ directory', () => {
    const repository: GitHubRepository = {
      stargazerCount: 100,
      rootContents: {
        entries: [
          {
            name: '__tests__',
            type: 'tree',
            object: {
              entries: [
                { name: 'App.test.tsx', type: 'blob' },
              ],
            },
          },
          { name: 'src', type: 'tree' },
        ],
      },
    };

    const result = analyzeTestsPresence(repository);
    expect(result.hasUnitTests).toBe(true);
  });

  test('should detect unit tests from test files', () => {
    const repository: GitHubRepository = {
      stargazerCount: 100,
      rootContents: {
        entries: [
          { name: 'index.test.ts', type: 'blob' },
          { name: 'utils.spec.js', type: 'blob' },
          { name: 'src', type: 'tree' },
        ],
      },
    };

    const result = analyzeTestsPresence(repository);
    expect(result.hasUnitTests).toBe(true);
  });

  test('should detect snapshot tests from __snapshots__ directory', () => {
    const repository: GitHubRepository = {
      stargazerCount: 100,
      rootContents: {
        entries: [
          { name: '__snapshots__', type: 'tree' },
          { name: 'src', type: 'tree' },
        ],
      },
    };

    const result = analyzeTestsPresence(repository);
    expect(result.hasSnapshotTests).toBe(true);
  });

  test('should detect snapshot tests from files with snapshot in name', () => {
    const repository: GitHubRepository = {
      stargazerCount: 100,
      rootContents: {
        entries: [
          { name: 'component.snapshot.js', type: 'blob' },
          { name: 'src', type: 'tree' },
        ],
      },
    };

    const result = analyzeTestsPresence(repository);
    expect(result.hasSnapshotTests).toBe(true);
  });

  test('should detect snapshot tests from various snapshot file patterns', () => {
    const repository: GitHubRepository = {
      stargazerCount: 100,
      rootContents: {
        entries: [
          { name: 'component.snap', type: 'blob' },
          { name: 'test.snapshot.js', type: 'blob' },
        ],
      },
    };

    const result = analyzeTestsPresence(repository);
    expect(result.hasSnapshotTests).toBe(true);
  });

  test('should return false for both when no tests detected', () => {
    const repository: GitHubRepository = {
      stargazerCount: 100,
      rootContents: {
        entries: [
          { name: 'src', type: 'tree' },
          { name: 'package.json', type: 'blob' },
          { name: 'README.md', type: 'blob' },
        ],
      },
    };

    const result = analyzeTestsPresence(repository);
    expect(result.hasUnitTests).toBe(false);
    expect(result.hasSnapshotTests).toBe(false);
  });

  test('should handle missing rootContents gracefully', () => {
    const repository: GitHubRepository = {
      stargazerCount: 100,
    };

    const result = analyzeTestsPresence(repository);
    expect(result.hasUnitTests).toBe(false);
    expect(result.hasSnapshotTests).toBe(false);
  });

  test('should detect both unit and snapshot tests', () => {
    const repository: GitHubRepository = {
      stargazerCount: 100,
      rootContents: {
        entries: [
          {
            name: 'test',
            type: 'tree',
            object: {
              entries: [
                { name: 'component.test.js', type: 'blob' },
              ],
            },
          },
          { name: '__snapshots__', type: 'tree' },
          { name: 'src', type: 'tree' },
        ],
      },
    };

    const result = analyzeTestsPresence(repository);
    expect(result.hasUnitTests).toBe(true);
    expect(result.hasSnapshotTests).toBe(true);
  });

  // New comprehensive tests for enhanced functionality
  test('should detect unit tests from files within test directories', () => {
    const repository: GitHubRepository = {
      stargazerCount: 100,
      rootContents: {
        entries: [
          {
            name: 'test',
            type: 'tree',
            object: {
              entries: [
                { name: 'unit', type: 'tree' },
                { name: 'integration.test.ts', type: 'blob' },
                { name: 'helper.js', type: 'blob' },
              ],
            },
          },
          { name: 'src', type: 'tree' },
        ],
      },
    };

    const result = analyzeTestsPresence(repository);
    expect(result.hasUnitTests).toBe(true);
  });

  test('should detect snapshot tests within test directories', () => {
    const repository: GitHubRepository = {
      stargazerCount: 100,
      rootContents: {
        entries: [
          {
            name: 'test',
            type: 'tree',
            object: {
              entries: [
                { name: '__snapshots__', type: 'tree' },
                { name: 'component.test.js', type: 'blob' },
              ],
            },
          },
          { name: 'src', type: 'tree' },
        ],
      },
    };

    const result = analyzeTestsPresence(repository);
    expect(result.hasUnitTests).toBe(true);
    expect(result.hasSnapshotTests).toBe(true);
  });

  test('should detect various test file extensions', () => {
    const repository: GitHubRepository = {
      stargazerCount: 100,
      rootContents: {
        entries: [
          { name: 'app.test.ts', type: 'blob' },
          { name: 'utils.spec.js', type: 'blob' },
          { name: 'component.test.tsx', type: 'blob' },
          { name: 'service.spec.ts', type: 'blob' },
        ],
      },
    };

    const result = analyzeTestsPresence(repository);
    expect(result.hasUnitTests).toBe(true);
  });

  test('should detect custom test directory names containing "test"', () => {
    const repository: GitHubRepository = {
      stargazerCount: 100,
      rootContents: {
        entries: [
          {
            name: 'integration-tests',
            type: 'tree',
            object: {
              entries: [
                { name: 'api.test.js', type: 'blob' },
              ],
            },
          },
          {
            name: 'unit-test',
            type: 'tree',
            object: {
              entries: [
                { name: 'math.spec.ts', type: 'blob' },
              ],
            },
          },
          { name: 'src', type: 'tree' },
        ],
      },
    };

    const result = analyzeTestsPresence(repository);
    expect(result.hasUnitTests).toBe(true);
  });

  test('should detect complex nested test structure', () => {
    const repository: GitHubRepository = {
      stargazerCount: 100,
      rootContents: {
        entries: [
          {
            name: '__tests__',
            type: 'tree',
            object: {
              entries: [
                { name: 'components', type: 'tree' },
                { name: '__snapshots__', type: 'tree' },
                { name: 'App.test.tsx', type: 'blob' },
                { name: 'utils.spec.js', type: 'blob' },
              ],
            },
          },
          {
            name: 'integration-test',
            type: 'tree',
            object: {
              entries: [
                { name: 'api.test.ts', type: 'blob' },
                { name: 'e2e.snapshot.js', type: 'blob' },
              ],
            },
          },
          { name: 'component.test.js', type: 'blob' }, // Root level test file
          { name: '__snapshots__', type: 'tree' }, // Root level snapshots
          { name: 'src', type: 'tree' },
        ],
      },
    };

    const result = analyzeTestsPresence(repository);
    expect(result.hasUnitTests).toBe(true);
    expect(result.hasSnapshotTests).toBe(true);
  });

  // New tests for comprehensive snapshot detection (searching everywhere)
  test('should detect snapshots in non-test directories', () => {
    const repository: GitHubRepository = {
      stargazerCount: 100,
      rootContents: {
        entries: [
          {
            name: 'src',
            type: 'tree',
            object: {
              entries: [
                { name: 'components', type: 'tree' },
                { name: '__snapshots__', type: 'tree' },
                { name: 'App.tsx', type: 'blob' },
              ],
            },
          },
          {
            name: 'docs',
            type: 'tree',
            object: {
              entries: [
                { name: 'ui.snapshot.png', type: 'blob' },
              ],
            },
          },
        ],
      },
    };

    const result = analyzeTestsPresence(repository);
    expect(result.hasSnapshotTests).toBe(true);
  });

  test('should not detect false positives for snapshot detection', () => {
    const repository: GitHubRepository = {
      stargazerCount: 100,
      rootContents: {
        entries: [
          {
            name: 'src',
            type: 'tree',
            object: {
              entries: [
                { name: 'components.js', type: 'blob' },
                { name: 'utils.ts', type: 'blob' },
              ],
            },
          },
          {
            name: 'docs',
            type: 'tree',
            object: {
              entries: [
                { name: 'README.md', type: 'blob' },
                { name: 'api.md', type: 'blob' },
              ],
            },
          },
        ],
      },
    };

    const result = analyzeTestsPresence(repository);
    expect(result.hasSnapshotTests).toBe(false);
  });

});