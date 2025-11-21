import { GitHubIssue } from '../../../src/library/types';
import { calculateTimeToFirstResponse, calculateOpenIssuesRatio } from '../../../src/library/utils/issues';

describe('calculateTimeToFirstResponse', () => {
  const createMockIssue = (
    createdAt: string,
    authorLogin: string,
    comments: Array<{ createdAt: string; authorLogin: string }>,
  ): GitHubIssue => ({
    number: 1,
    createdAt,
    author: { login: authorLogin },
    comments: {
      nodes: comments.map(comment => ({
        createdAt: comment.createdAt,
        author: { login: comment.authorLogin },
      })),
    },
  });

  test('should return undefined for empty or undefined input', () => {
    expect(calculateTimeToFirstResponse([])).toBeUndefined();
    expect(calculateTimeToFirstResponse(undefined)).toBeUndefined();
  });

  test('should return undefined when no valid responses exist', () => {
    const issues = [
      createMockIssue('2024-01-01T00:00:00Z', 'author1', []),
      createMockIssue('2024-01-01T00:00:00Z', 'author2', [
        { createdAt: '2024-01-01T01:00:00Z', authorLogin: 'author2' }, // Self-response
      ]),
    ];
    expect(calculateTimeToFirstResponse(issues)).toBeUndefined();
  });

  test('should ignore bot and automation responses', () => {
    const issues = [
      createMockIssue('2024-01-01T00:00:00Z', 'author1', [
        { createdAt: '2024-01-01T01:00:00Z', authorLogin: 'dependabot[bot]' },
        { createdAt: '2024-01-02T00:00:00Z', authorLogin: 'human-responder' },
      ]),
    ];

    // Should use human response (1 day = 1/7 weeks ≈ 0.1 weeks)
    const result = calculateTimeToFirstResponse(issues);
    expect(result).toBeCloseTo(0.1, 1);
  });

  test('should calculate response time in weeks correctly', () => {
    const issues = [
      createMockIssue('2024-01-01T00:00:00Z', 'author1', [
        { createdAt: '2024-01-08T00:00:00Z', authorLogin: 'responder' }, // 1 week later
      ]),
    ];

    expect(calculateTimeToFirstResponse(issues)).toBe(1.0);
  });

  test('should calculate average across multiple issues', () => {
    const issues = [
      createMockIssue('2024-01-01T00:00:00Z', 'author1', [
        { createdAt: '2024-01-08T00:00:00Z', authorLogin: 'responder' }, // 1 week
      ]),
      createMockIssue('2024-01-01T00:00:00Z', 'author2', [
        { createdAt: '2024-01-15T00:00:00Z', authorLogin: 'responder' }, // 2 weeks
      ]),
    ];

    // Average: (1 + 2) / 2 = 1.5 weeks
    expect(calculateTimeToFirstResponse(issues)).toBe(1.5);
  });

  test('should use first valid response and ignore later ones', () => {
    const issues = [
      createMockIssue('2024-01-01T00:00:00Z', 'author1', [
        { createdAt: '2024-01-01T01:00:00Z', authorLogin: 'author1' }, // Self-response, ignore
        { createdAt: '2024-01-01T02:00:00Z', authorLogin: 'dependabot[bot]' }, // Bot, ignore
        { createdAt: '2024-01-01T03:00:00Z', authorLogin: 'first-responder' }, // First valid response
        { createdAt: '2024-01-01T04:00:00Z', authorLogin: 'second-responder' }, // Later response, ignore
      ]),
    ];

    // Should use first valid response (3 hours)
    const result = calculateTimeToFirstResponse(issues);
    expect(result).toBeCloseTo(0.0, 1);
  });
});

describe('calculateOpenIssuesRatio', () => {
  test('should return 100 when openIssuesCount is undefined', () => {
    expect(calculateOpenIssuesRatio(undefined, 100)).toBe(100.0);
  });

  test('should return 100 when totalIssuesCount is undefined', () => {
    expect(calculateOpenIssuesRatio(10, undefined)).toBe(100.0);
  });

  test('should return 100 when both counts are undefined', () => {
    expect(calculateOpenIssuesRatio(undefined, undefined)).toBe(100.0);
  });

  test('should return 100 when totalIssuesCount is 0', () => {
    expect(calculateOpenIssuesRatio(0, 0)).toBe(100.0);
  });

  test('should calculate ratio correctly for all issues open', () => {
    expect(calculateOpenIssuesRatio(100, 100)).toBe(100.0);
  });

  test('should calculate ratio correctly for no open issues', () => {
    expect(calculateOpenIssuesRatio(0, 100)).toBe(0.0);
  });

  test('should round to 1 decimal place', () => {
    expect(calculateOpenIssuesRatio(33, 100)).toBe(33.0);
    expect(calculateOpenIssuesRatio(1, 3)).toBe(33.3);
  });

  test('should calculate awkward ratios correctly', () => {
    expect(calculateOpenIssuesRatio(6, 35)).toBe(17.1);
    expect(calculateOpenIssuesRatio(7, 23)).toBe(30.4);
  });
});