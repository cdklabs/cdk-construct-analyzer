import { PackageData } from '../types';
import { GitHubCollector, GitHubRawData } from './github';
import { NpmCollector, NpmPackageData, NpmDownloadData } from './npm';

/**
 * Raw data fetched from external APIs before processing
 */
interface RawPackageData {
  readonly npm: NpmPackageData;
  readonly downloads: NpmDownloadData;
  readonly github?: GitHubRawData;
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

  let githubRawData;
  try {
    await githubCollector.fetchPackage(npmData.repository.url);
    githubRawData = githubCollector.getRawData();
  } catch (error) {
    console.warn(`GitHub fetch failed: ${error}`);
  }

  return {
    npm: npmData,
    downloads: downloadData,
    ...(githubRawData && { github: githubRawData }),
  };
}

/**
 * Phase 2: Process raw data into final structured format organized by signal names
 */
function processPackageData(rawData: RawPackageData): PackageData {
  // Process GitHub data directly in signals
  if (!rawData.github) {
    return { version: rawData.npm.version };
  }

  const { repoData, repoContents, readmeContent } = rawData.github;

  // Process README existence - check if any file contains the word "readme", case-insensitive
  const hasReadme = Boolean(readmeContent);

  // Process API documentation existence - check for docs directories and API files
  const hasApiDocs = Object.keys(repoContents).some(path => {
    const lowercasePath = path.toLowerCase();
    return ['docs', 'documentation', 'api'].includes(lowercasePath);
  });

  // Process examples existence - check for code blocks in README
  const numBackticks = (rawData.github.readmeContent?.match(/```/g) || []).length;

  const numExamples = Math.floor(numBackticks / 2);
  const hasExamples = numExamples > 0;
  const multipleExamples = numExamples > 1;

  return {
    version: rawData.npm.version,
    weeklyDownloads: rawData.downloads.downloads,
    githubStars: repoData.stargazers_count || 0,
    documentationCompleteness: {
      hasReadme,
      hasApiDocs,
      hasExamples,
      multipleExamples,
    },
  };
}

/**
 * Main entry point: Fetch and process package data
 */
export async function collectPackageData(packageName: string): Promise<PackageData> {
  const rawData = await fetchAllData(packageName);
  return processPackageData(rawData);
}