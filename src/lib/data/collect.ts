import { DocumentationCompleteness, PackageData } from '../types';
import { GitHubCollector, GitHubRawData } from './github';
import { NpmCollector, NpmPackageData, NpmDownloadData } from './npm';

/**
 * Raw data fetched from external APIs before processing
 */
interface RawPackageData {
  readonly npm: NpmPackageData;
  readonly downloads: NpmDownloadData;
  readonly github: GitHubRawData | null;
}

/**
 * Phase 1: Fetch all raw data from external APIs
 */
async function fetchAllData(packageName: string): Promise<RawPackageData> {
  // Create collectors
  const npmCollector = new NpmCollector();
  const githubCollector = new GitHubCollector();

  // Fetch NPM data (required)
  await npmCollector.fetchPackage(packageName);
  const npmData = npmCollector.getPackageData();
  const downloadData = await npmCollector.getDownloadData();

  // Fetch GitHub raw data if repository URL exists
  let githubRawData: GitHubRawData | null = null;
  if (npmData.repository?.url) {
    try {
      await githubCollector.fetchPackage(npmData.repository.url);
      githubRawData = githubCollector.getRawData();
    } catch (error) {
      console.warn(`GitHub fetch failed: ${error}`);
    }
  } else {
    console.log('No repository URL found in NPM data');
  }

  return {
    npm: npmData,
    downloads: downloadData,
    github: githubRawData,
  };
}

/**
 * Phase 2: Process raw data into final structured format organized by signal names
 */
function processPackageData(rawData: RawPackageData): PackageData {
  // Process GitHub data directly in signals
  let githubStars = 0;
  let documentationCompleteness: DocumentationCompleteness = {
    hasReadme: false,
    hasApiDocs: false,
    hasExamples: false,
  };

  if (rawData.github) {
    const { stars, repoContents } = rawData.github;
    githubStars = stars;

    // Process README existence - check if any file contains "README"
    const hasReadme = Boolean(rawData.github.readmeContent);

    // Process API documentation existence - check for docs directories and API files
    const hasApiDocs = Object.keys(repoContents).some(path => {
      const lowerPath = path.toLowerCase();
      return lowerPath.includes('docs') ||
        lowerPath.includes('documentation') ||
        lowerPath.includes('api');
    });

    // Process examples existence - check for code blocks in README
    const hasExamples = Boolean(rawData.github.readmeContent && rawData.github.readmeContent.includes('```'));

    documentationCompleteness = {
      hasReadme,
      hasApiDocs,
      hasExamples,
    };
  }
  return {
    version: rawData.npm.version,
    weeklyDownloads: rawData.downloads.downloads,
    githubStars: githubStars,
    documentationCompleteness: documentationCompleteness,
  };
}

/**
 * Main entry point: Fetch and process package data
 */
export async function collectPackageData(packageName: string): Promise<PackageData> {
  const rawData = await fetchAllData(packageName);
  return processPackageData(rawData);
}

// Re-export types and classes for convenience
export type { NpmPackageData, NpmDownloadData, DocumentationCompleteness };
export { NpmCollector, GitHubCollector };