import type { GitHubRepository } from '../../../src/lib/types';
import { analyzeTestsPresence } from '../../../src/lib/utils/tests';

describe('analyzeTestsPresence', () => {
  test('should detect unit tests from test directory', () => {
    const repository: GitHubRepository = {
      stargazerCount: 100,
      rootContents: {
        entries: [
          { name: 'test', type: 'tree' },
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
          { name: 'tests', type: 'tree' },
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
          { name: '__tests__', type: 'tree' },
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
          { name: 'test', type: 'tree' },
          { name: '__snapshots__', type: 'tree' },
          { name: 'src', type: 'tree' },
        ],
      },
    };

    const result = analyzeTestsPresence(repository);
    expect(result.hasUnitTests).toBe(true);
    expect(result.hasSnapshotTests).toBe(true);
  });


});