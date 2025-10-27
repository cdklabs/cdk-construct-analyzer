import type { GitHubRepository } from '../types';

/**
 * Documentation-related utility functions
 */

export interface DocumentationCompleteness {
  hasReadme: boolean;
  hasApiDocs: boolean;
  hasExample: boolean;
  multipleExamples: boolean;
}

/**
 * Analyze documentation completeness from GitHub repository data
 */
export function analyzeDocumentationCompleteness(repository: GitHubRepository): DocumentationCompleteness {
  const readmeContent = repository.readmeContent;
  const hasReadme = Boolean(readmeContent);

  const hasApiDocs = repository.rootContents?.entries?.some((entry) => {
    const lowercaseName = entry.name.toLowerCase();
    return ['docs', 'documentation', 'api'].includes(lowercaseName);
  }) ?? false;

  const numBackticks = (readmeContent?.match(/```/g) ?? []).length;
  const numExamples = Math.floor(numBackticks / 2);
  const hasExample = numExamples > 0;
  const multipleExamples = numExamples > 1;

  return {
    hasReadme,
    hasApiDocs,
    hasExample,
    multipleExamples,
  };
}