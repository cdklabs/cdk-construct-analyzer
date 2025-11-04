import type { GitHubRepository, GitHubRepositoryEntry, TestsData } from '../types';

/**
 * Analyze repository contents to detect presence of unit tests and snapshot tests
 */
export function analyzeTestsPresence(repository: GitHubRepository): TestsData {
  const entries = repository.rootContents?.entries ?? [];

  return {
    hasUnitTests: hasUnitTests(entries),
    hasSnapshotTests: hasSnapshotTests(entries),
  };
}

function hasUnitTests(entries: GitHubRepositoryEntry[]): boolean {
  return entries.some(entry =>
    entry.name.toLowerCase().includes('test') ||
    (entry.type === 'tree' && entry.object?.entries?.some(file =>
      file.type === 'blob' && file.name.includes('test'),
    )),
  );
}

function hasSnapshotTests(entries: GitHubRepositoryEntry[], depth = 0): boolean {
  // GitHubRepositoryEntry also only stores contents up to 4 layers deep so this depths parameter
  // has no use for now, but I think it's good to have
  if (depth > 3) return false;

  return entries.some(entry => {
    if (isSnapshotRelated(entry.name)) return true;

    if (entry.type === 'tree' && entry.object?.entries) {
      return hasSnapshotTests(entry.object.entries, depth + 1);
    }

    return false;
  });
}

function isSnapshotRelated(name: string): boolean {
  return name.toLowerCase().includes('snapshot') || name.endsWith('.snap');
}