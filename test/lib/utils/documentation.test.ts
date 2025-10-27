import type { GitHubRepository } from '../../../src/lib/types';
import { analyzeDocumentationCompleteness } from '../../../src/lib/utils/documentation';

describe('analyzeDocumentationCompleteness', () => {
  test('should detect complete documentation', () => {
    const repository: GitHubRepository = {
      readmeContent: '# Test Package\n\n```js\nconsole.log("example1");\n```\n\n```js\nconsole.log("example2");\n```',
      rootContents: {
        entries: [
          { name: 'README.md', type: 'blob' as const },
          { name: 'docs', type: 'tree' as const },
        ],
      },
      stargazerCount: 100,
    };

    const result = analyzeDocumentationCompleteness(repository);

    expect(result).toEqual({
      hasReadme: true,
      hasApiDocs: true,
      hasExample: true,
      multipleExamples: true,
    });
  });

  test('should detect missing documentation elements', () => {
    const repository: GitHubRepository = {
      readmeContent: '# Test Package\n\nBasic description without examples.',
      rootContents: {
        entries: [
          { name: 'README.md', type: 'blob' as const },
          { name: 'src', type: 'tree' as const },
        ],
      },
      stargazerCount: 50,
    };

    const result = analyzeDocumentationCompleteness(repository);

    expect(result).toEqual({
      hasReadme: true,
      hasApiDocs: false,
      hasExample: false,
      multipleExamples: false,
    });
  });

  test('should handle missing readme', () => {
    const repository: GitHubRepository = {
      readmeContent: undefined,
      rootContents: {
        entries: [
          { name: 'documentation', type: 'tree' as const },
        ],
      },
      stargazerCount: 25,
    };

    const result = analyzeDocumentationCompleteness(repository);

    expect(result).toEqual({
      hasReadme: false,
      hasApiDocs: true,
      hasExample: false,
      multipleExamples: false,
    });
  });

  test('should detect single example', () => {
    const repository: GitHubRepository = {
      readmeContent: '# Test\n\n```js\nconsole.log("single example");\n```',
      rootContents: {
        entries: [
          { name: 'README.md', type: 'blob' as const },
        ],
      },
      stargazerCount: 10,
    };

    const result = analyzeDocumentationCompleteness(repository);

    expect(result).toEqual({
      hasReadme: true,
      hasApiDocs: false,
      hasExample: true,
      multipleExamples: false,
    });
  });

  test('should handle missing root contents', () => {
    const repository: GitHubRepository = {
      readmeContent: '# Test Package',
      rootContents: undefined,
      stargazerCount: 5,
    };

    const result = analyzeDocumentationCompleteness(repository);

    expect(result).toEqual({
      hasReadme: true,
      hasApiDocs: false,
      hasExample: false,
      multipleExamples: false,
    });
  });
});