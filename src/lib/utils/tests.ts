import type { GitHubRepository, TestsData } from '../types';

/**
 * Analyze repository contents to detect presence of unit tests and snapshot tests
 */
export function analyzeTestsPresence(repository: GitHubRepository): TestsData {
  const entries = repository.rootContents?.entries ?? [];

  console.log(entries);
  const hasTestDirectory = entries.some(entry =>
    entry.type === 'tree' && isTestDirectory(entry.name),
  );

  const hasTestFiles = entries.some(entry =>
    entry.type === 'blob' && entry.name.includes('.test.'),
  );

  // Basic heuristic: if we have test directories or test files, assume unit tests exist
  const hasUnitTests = hasTestDirectory || hasTestFiles;

  const hasSnapshotTests = checkForSnapshotTests(repository);

  return {
    hasUnitTests,
    hasSnapshotTests,
  };
}

/**
 * Check if a directory name indicates it contains tests
 */
function isTestDirectory(name: string): boolean {
  const lowerName = name.toLowerCase();
  return lowerName.includes('test');
}

/**
 * Check for snapshot tests using simple heuristics
 */
function checkForSnapshotTests(repository: GitHubRepository): boolean {
  const entries = repository.rootContents?.entries ?? [];

  // Check for direct snapshot files/directories in root
  return entries.some(entry =>
    entry.name.toLowerCase().includes('snapshot'),
  );
}