import { PackageData, GitHubRepository } from '../types';
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
    };
  }

  const repository = rawData.github;

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

  // Process contributors data
  const contributorsLastMonth = processContributorsData(contributorsData);

  return {
    'version': rawData.npm.version,
    'numberOfContributors(Maintenance)': contributorsLastMonth,
    'documentationCompleteness': {
      hasReadme,
      hasApiDocs,
      hasExample,
      multipleExamples,
    },
    'weeklyDownloads': rawData.downloads.downloads,
    'githubStars': repoData.stargazers_count ?? 0,
    'numberOfContributors(Popularity)': contributorsLastMonth,
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
export function processContributorsData(contributorsData?: any[]): number {
  if (!contributorsData?.length) {
    return 0;
  }

  const contributors = new Set<string>();

  for (const commit of contributorsData) {
    const { author, committer, commit: commitData } = commit;
    const message = commitData?.message ?? '';

    // Process author
    if (author?.login && !isBotOrAutomated(author.login, message)) {
      contributors.add(author.login);
    }

    // Process committer if different from author
    if (committer?.login &&
        committer.login !== author?.login &&
        !isBotOrAutomated(committer.login, message)) {
      contributors.add(committer.login);
    }
  }

  return contributors.size;
}

/**
 * Check if a username or commit message indicates bot/automated activity
 */
export function isBotOrAutomated(username: string, commitMessage: string): boolean {
  const botPatterns = [
    /bot$/i,
    /\[bot\]$/i,
    /^automation/i,
  ];

  if (botPatterns.some(pattern => pattern.test(username))) {
    return true;
  }

  const automatedMessagePatterns = [
    /^chore\(deps\):/i,
    /^bump version/i,
    /^update dependencies/i,
    /^auto/i,
  ];

  if (automatedMessagePatterns.some(pattern => pattern.test(commitMessage.trim()))) {
    return true;
  }

  return false;
}