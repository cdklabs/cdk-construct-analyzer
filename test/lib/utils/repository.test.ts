import { extractRepoInfo } from '../../../src/lib/utils/repository';

describe('extractRepoInfo', () => {
  test('should parse GitHub URLs correctly', () => {
    const repo1 = extractRepoInfo('https://github.com/test/repo');
    expect(repo1.owner).toBe('test');
    expect(repo1.repo).toBe('repo');

    const repo2 = extractRepoInfo('git+https://github.com/facebook/react.git');
    expect(repo2.owner).toBe('facebook');
    expect(repo2.repo).toBe('react');
  });

  test('should throw error for invalid URLs', () => {
    expect(() => extractRepoInfo('https://gitlab.com/test/repo')).toThrow(
      'Could not parse GitHub URL',
    );
  });
});