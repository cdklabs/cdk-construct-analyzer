import { PackageData, GitHubRepository, GitHubCommit } from '../types';
import { GitHubRepo } from './github-repo';
import { NpmCollector, NpmPackageData, NpmDownloadData } from './npm';

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

  const readmeContent = repository.readmeContent;

  // Process contributor data
  const contributorCount = processContributorsData(repository.commits);

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
    'version': rawData.npm.version,
    'numberOfContributors(Maintenance)': contributorCount,
    'documentationCompleteness': {
      hasReadme,
      hasApiDocs,
      hasExample,
      multipleExamples,
    },
    'weeklyDownloads': rawData.downloads.downloads,
    'githubStars': repository.stargazerCount ?? 0,
    'numberOfContributors(Popularity)': contributorCount,
    'stableVersioning': {
      majorVersion: parseInt(rawData.npm.version.split('.')[0], 10) >= 1,
      isDeprecated: rawData.npm.isDeprecated,
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

export function extractRepoInfo(repositoryUrl: string): { owner: string; repo: string } {
  const patterns = [
    /github\.com[\/:]([^\/]+)\/([^\/\.]+)/, // "https://github.com/yargs/yargs"
    /git\+https:\/\/github\.com\/([^\/]+)\/([^\/\.]+)/, // "git+https://github.com/facebook/react.git"
    /https:\/\/github\.com\/([^\/]+)\/([^\/\.]+)/, // "github.com:microsoft/typescript"
  ];

  for (const pattern of patterns) {
    const match = repositoryUrl.match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ''),
      };
    }
  }
  throw new Error('Could not parse GitHub URL');
}

/**
 * Process contributors data to count unique human contributors from the last month
 */
export function processContributorsData(contributorsData?: GitHubCommit[]): number {
  if (!contributorsData?.length) {
    return 0;
  }

  const contributors = new Set<string>();

  for (const commit of contributorsData) {
    if (commit.author?.user?.login && !isBotOrAutomated(commit.author.user.login)) {
      contributors.add(commit.author.user.login);
    } else if (commit.author?.email && !isBotOrAutomated(commit.author.email)) {
      contributors.add(commit.author.email);
    }
  }

  return contributors.size;
}

/**
 * Check if a username or commit message indicates bot/automated activity
 */
export function isBotOrAutomated(username: string): boolean {
  const botPatterns = [
    /bot/i, // Match "bot" anywhere in the string
    /^automation/i,
  ];

  if (botPatterns.some(pattern => pattern.test(username))) {
    return true;
  }

  return false;
}