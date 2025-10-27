import { processContributorsData, isBotOrAutomated } from '../../../src/lib/utils/contributors';

describe('processContributorsData', () => {
  test('should return 0 for undefined data', () => {
    expect(processContributorsData(undefined)).toBe(0);
  });

  test('should return 0 for empty array', () => {
    expect(processContributorsData([])).toBe(0);
  });

  test('should count unique human contributors', () => {
    const contributorsData = [
      {
        author: { user: { login: 'user1' } },
      },
      {
        author: { user: { login: 'user2' } },
      },
    ];

    expect(processContributorsData(contributorsData)).toBe(2);
  });

  test('should exclude bots from count', () => {
    const contributorsData = [
      {
        author: { user: { login: 'user1' } },
      },
      {
        author: { user: { login: 'dependabot[bot]' } },
      },
      {
        author: { user: { login: 'github-actions[bot]' } },
      },
    ];

    expect(processContributorsData(contributorsData)).toBe(1);
  });

  test('should handle email-only authors', () => {
    const contributorsData = [
      {
        author: { email: 'user1@example.com' },
      },
      {
        author: { user: { login: 'user2' } },
      },
    ];

    expect(processContributorsData(contributorsData)).toBe(2);
  });

  test('should not count duplicate contributors', () => {
    const contributorsData = [
      {
        author: { user: { login: 'user1' } },
      },
      {
        author: { user: { login: 'user1' } },
      },
    ];

    expect(processContributorsData(contributorsData)).toBe(1);
  });

  test('should exclude bot emails', () => {
    const contributorsData = [
      {
        author: { email: 'user@example.com' },
      },
      {
        author: { email: 'dependabot[bot]@users.noreply.github.com' },
      },
      {
        author: { user: { login: 'user3' } },
      },
    ];

    expect(processContributorsData(contributorsData)).toBe(2);
  });
});

describe('isBotOrAutomated', () => {
  describe('bot username patterns', () => {
    test('should detect [bot] suffix', () => {
      expect(isBotOrAutomated('dependabot[bot]')).toBe(true);
      expect(isBotOrAutomated('github-actions[bot]')).toBe(true);
    });

    test('should detect bot suffix', () => {
      expect(isBotOrAutomated('renovatebot')).toBe(true);
      expect(isBotOrAutomated('greenkeeper-bot')).toBe(true);
    });

    test('should detect automation prefix', () => {
      expect(isBotOrAutomated('automation-user')).toBe(true);
      expect(isBotOrAutomated('Automation-Service')).toBe(true);
    });

    test('should not flag normal usernames', () => {
      expect(isBotOrAutomated('john-doe')).toBe(false);
      expect(isBotOrAutomated('contributor123')).toBe(false);
      expect(isBotOrAutomated('user-name')).toBe(false);
    });
  });

  test('should handle empty inputs', () => {
    expect(isBotOrAutomated('')).toBe(false);
  });

  test('should be case insensitive', () => {
    expect(isBotOrAutomated('DEPENDABOT[BOT]')).toBe(true);
    expect(isBotOrAutomated('AUTOMATION-USER')).toBe(true);
  });
});