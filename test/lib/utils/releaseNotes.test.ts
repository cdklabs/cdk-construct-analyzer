import type { GitHubRepository } from '../../../src/library/types';
import { analyzeReleaseNotesContent, countFeatsAndFixes } from '../../../src/library/utils/releaseNotes';

describe('analyzeReleaseNotesContent', () => {
  test('should return false for both when no releases exist', () => {
    const repository: GitHubRepository = {
      stargazerCount: 0,
      releases: [],
    };

    const result = analyzeReleaseNotesContent(repository);
    expect(result.hasFeats).toBe(false);
    expect(result.hasFixes).toBe(false);
  });

  test('should return false for both when releases is undefined', () => {
    const repository: GitHubRepository = {
      stargazerCount: 0,
    };

    const result = analyzeReleaseNotesContent(repository);
    expect(result.hasFeats).toBe(false);
    expect(result.hasFixes).toBe(false);
  });

  test('should return true for both when release contains features and fixes', () => {
    const repository: GitHubRepository = {
      stargazerCount: 0,
      releases: [
        {
          publishedAt: '2025-01-01T00:00:00Z',
          tagName: 'v1.0.0',
          description: 'This release includes new features and bug fixes',
        },
      ],
    };

    const result = analyzeReleaseNotesContent(repository);
    expect(result.hasFeats).toBe(true);
    expect(result.hasFixes).toBe(true);
  });

  test('should return true for features only when release contains only features', () => {
    const repository: GitHubRepository = {
      stargazerCount: 0,
      releases: [
        {
          publishedAt: '2025-01-01T00:00:00Z',
          tagName: 'v1.0.0',
          description: 'feat: add new authentication system',
        },
      ],
    };

    const result = analyzeReleaseNotesContent(repository);
    expect(result.hasFeats).toBe(true);
    expect(result.hasFixes).toBe(false);
  });

  test('should return true for fixes only when release contains only fixes', () => {
    const repository: GitHubRepository = {
      stargazerCount: 0,
      releases: [
        {
          publishedAt: '2025-01-01T00:00:00Z',
          tagName: 'v1.0.0',
          description: 'fix: resolve memory leak issue',
        },
      ],
    };

    const result = analyzeReleaseNotesContent(repository);
    expect(result.hasFeats).toBe(false);
    expect(result.hasFixes).toBe(true);
  });

  test('should detect conventional commit patterns', () => {
    const repository: GitHubRepository = {
      stargazerCount: 0,
      releases: [
        {
          publishedAt: '2025-01-01T00:00:00Z',
          tagName: 'v1.0.0',
          description: 'feat: add new authentication system\nfix: resolve memory leak issue',
        },
      ],
    };

    const result = analyzeReleaseNotesContent(repository);
    expect(result.hasFeats).toBe(true);
    expect(result.hasFixes).toBe(true);
  });

  test('should detect markdown sections', () => {
    const repository: GitHubRepository = {
      stargazerCount: 0,
      releases: [
        {
          publishedAt: '2025-01-01T00:00:00Z',
          tagName: 'v1.0.0',
          description: '## Features\n- Added new dashboard\n\n## Bug Fixes\n- Fixed login issue',
        },
      ],
    };

    const result = analyzeReleaseNotesContent(repository);
    expect(result.hasFeats).toBe(true);
    expect(result.hasFixes).toBe(true);
  });

  test('should return false for both when release body has no feature/fix content', () => {
    const repository: GitHubRepository = {
      stargazerCount: 0,
      releases: [
        {
          publishedAt: '2025-01-01T00:00:00Z',
          tagName: 'v1.0.0',
          description: 'Minor documentation updates and dependency bumps',
        },
      ],
    };

    const result = analyzeReleaseNotesContent(repository);
    expect(result.hasFeats).toBe(false);
    expect(result.hasFixes).toBe(false);
  });

  test('should return false for both when release body is empty', () => {
    const repository: GitHubRepository = {
      stargazerCount: 0,
      releases: [
        {
          publishedAt: '2025-01-01T00:00:00Z',
          tagName: 'v1.0.0',
          description: '',
        },
      ],
    };

    const result = analyzeReleaseNotesContent(repository);
    expect(result.hasFeats).toBe(false);
    expect(result.hasFixes).toBe(false);
  });

  test('should find features and fixes across multiple releases', () => {
    const repository: GitHubRepository = {
      stargazerCount: 0,
      releases: [
        {
          publishedAt: '2025-01-01T00:00:00Z',
          tagName: 'v1.0.0',
          description: 'feat: add new dashboard',
        },
        {
          publishedAt: '2025-01-02T00:00:00Z',
          tagName: 'v1.0.1',
          description: 'fix: resolve login issue',
        },
      ],
    };

    const result = analyzeReleaseNotesContent(repository);
    expect(result.hasFeats).toBe(true);
    expect(result.hasFixes).toBe(true);
  });
});


describe('countFeatsAndFixes', () => {
  test('should return 0 when no releases are provided', () => {
    const repository: GitHubRepository = {
      stargazerCount: 0,
      releases: [],
    };

    expect(countFeatsAndFixes(repository)).toBe(0);
  });

  test('should return 0 when releases is undefined', () => {
    const repository: GitHubRepository = {
      stargazerCount: 0,
    };

    expect(countFeatsAndFixes(repository)).toBe(0);
  });

  test('should count features and fixes in release descriptions', () => {
    const repository: GitHubRepository = {
      stargazerCount: 0,
      releases: [
        {
          publishedAt: new Date().toISOString(),
          tagName: 'v1.0.0',
          description: 'feat fix',
        },
      ],
    };

    expect(countFeatsAndFixes(repository)).toBe(2);
  });

  test('should count across multiple releases', () => {
    const repository: GitHubRepository = {
      stargazerCount: 0,
      releases: [
        {
          publishedAt: new Date().toISOString(),
          tagName: 'v1.0.0',
          description: 'feat fix',
        },
        {
          publishedAt: new Date().toISOString(),
          tagName: 'v1.1.0',
          description: 'feat feat',
        },
      ],
    };

    expect(countFeatsAndFixes(repository)).toBe(4);
  });
});
