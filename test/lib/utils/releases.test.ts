import type { GitHubRelease } from '../../../src/lib/types';
import { calculateReleaseFrequency } from '../../../src/lib/utils/releases';

describe('calculateReleaseFrequency', () => {
  const currentDate = new Date('2024-10-28T00:00:00Z');

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(currentDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('should return 0 when no releases are provided', () => {
    expect(calculateReleaseFrequency(undefined)).toBe(0);
    expect(calculateReleaseFrequency([])).toBe(0);
  });

  test('should count releases from the past year', () => {
    const releases: GitHubRelease[] = [
      { publishedAt: '2024-10-01T00:00:00Z', tagName: 'v1.0.0' },
      { publishedAt: '2024-08-01T00:00:00Z', tagName: 'v0.9.0' },
      { publishedAt: '2024-06-01T00:00:00Z', tagName: 'v0.8.0' },
      { publishedAt: '2024-01-01T00:00:00Z', tagName: 'v0.7.0' },
      { publishedAt: '2023-12-01T00:00:00Z', tagName: 'v0.6.0' },
    ];

    expect(calculateReleaseFrequency(releases)).toBe(5);
  });

  test('should exclude releases older than one year', () => {
    const releases: GitHubRelease[] = [
      { publishedAt: '2024-10-01T00:00:00Z', tagName: 'v1.0.0' },
      { publishedAt: '2024-08-01T00:00:00Z', tagName: 'v0.9.0' },
      { publishedAt: '2023-10-01T00:00:00Z', tagName: 'v0.8.0' }, // Older than 1 year
      { publishedAt: '2022-01-01T00:00:00Z', tagName: 'v0.7.0' }, // Much older
    ];

    expect(calculateReleaseFrequency(releases)).toBe(2);
  });

  test('should handle releases exactly at the one year boundary', () => {
    const releases: GitHubRelease[] = [
      { publishedAt: '2024-10-01T00:00:00Z', tagName: 'v1.0.0' },
      { publishedAt: '2023-10-28T00:00:00Z', tagName: 'v0.9.0' }, // Exactly 1 year ago
      { publishedAt: '2023-10-27T23:59:59Z', tagName: 'v0.8.0' }, // Just over 1 year ago
    ];

    expect(calculateReleaseFrequency(releases)).toBe(2);
  });

  test('should handle releases with missing publishedAt dates', () => {
    const releases: GitHubRelease[] = [
      { publishedAt: '2024-10-01T00:00:00Z', tagName: 'v1.0.0' },
      { publishedAt: '', tagName: 'v0.9.0' }, // Empty date
      { publishedAt: '2024-08-01T00:00:00Z', tagName: 'v0.8.0' },
    ];

    expect(calculateReleaseFrequency(releases)).toBe(2);
  });

  test('should handle invalid date formats gracefully', () => {
    const releases: GitHubRelease[] = [
      { publishedAt: '2024-10-01T00:00:00Z', tagName: 'v1.0.0' },
      { publishedAt: 'invalid-date', tagName: 'v0.9.0' },
      { publishedAt: '2024-08-01T00:00:00Z', tagName: 'v0.8.0' },
    ];

    expect(calculateReleaseFrequency(releases)).toBe(2);
  });

  test('should handle high frequency releases (55+ releases)', () => {
    const releases: GitHubRelease[] = [];

    // Generate 60 releases over the past year
    for (let i = 0; i < 60; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - (i * 6)); // One release every 6 days
      releases.push({
        publishedAt: date.toISOString(),
        tagName: `v1.${i}.0`,
      });
    }

    const result = calculateReleaseFrequency(releases);
    expect(result).toBeGreaterThan(55);
  });
});