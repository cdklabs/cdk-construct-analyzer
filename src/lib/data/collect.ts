import { PackageData, GitHubRepository } from '../types';
import { GitHubRepo } from './github-repo';
import { NpmCollector, NpmPackageData, NpmDownloadData } from './npm';
import { extractRepoInfo, processContributorsData, analyzeDocumentationCompleteness } from '../utils';

/**
 * Raw data fetched from external APIs before processing
 */
interface RawPackageData {
  readonly npm: NpmPackageData;
  readonly downloads: NpmDownloadData;
  readonly github?: GitHubRepository;
}

/**
 * Phase 1: Fetch all raw data from external APIs
 */
async function fetchAllData(packageName: string): Promise<RawPackageData> {
  const npmCollector = new NpmCollector();

  await npmCollector.fetchPackage(packageName);
  const npmData = npmCollector.getPackageData();
  const downloadData = await npmCollector.fetchDownloadData();

  const repoInfo = extractRepoInfo(npmData.repository.url);
  const githubRepo = new GitHubRepo(repoInfo.owner, repoInfo.repo);

  let githubData;
  try {
    const response = await githubRepo.metadata();
    if (response.error) {
      console.warn(`GitHub fetch failed: ${response.error}`);
    } else if (response.data) {
      githubData = response.data.repository;
    }
  } catch (error) {
    console.warn(`GitHub fetch failed: ${error}`);
  }


  return {
    npm: npmData,
    downloads: downloadData,
    ...(githubData && { github: githubData }),
  };
}

/**
 * Phase 2: Process raw data into final structured format organized by signal names
 */
function processPackageData(rawData: RawPackageData): PackageData {
  if (!rawData.github) {
    return {
      version: rawData.npm.version,
      weeklyDownloads: rawData.downloads.downloads,
      stableVersioning: {
        majorVersion: parseInt(rawData.npm.version.split('.')[0], 10) >= 1,
        isDeprecated: rawData.npm.isDeprecated,
      },
    };
  }

  const repository = rawData.github;

  return {
    'version': rawData.npm.version,
    'numberOfContributors(Maintenance)': processContributorsData(repository.commits),
    'documentationCompleteness': analyzeDocumentationCompleteness(repository),
    'weeklyDownloads': rawData.downloads.downloads,
    'githubStars': repository.stargazerCount ?? 0,
    'stableVersioning': {
      majorVersion: parseInt(rawData.npm.version.split('.')[0], 10) >= 1,
      isDeprecated: rawData.npm.isDeprecated,
    },
    'numberOfContributors(Popularity)': processContributorsData(repository.commits),
  };
}

/**
 * Main entry point: Fetch and process package data
 */
export async function collectPackageData(packageName: string): Promise<PackageData> {
  const rawData = await fetchAllData(packageName);
  return processPackageData(rawData);
}

