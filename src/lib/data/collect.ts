import { PackageData, GitHubRepository, GitHubCommit, GitHubIssue } from '../types';
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

  const timeToFirstResponse = calculateTimeToFirstResponse(repository.issues);

  return {
    'version': rawData.npm.version,
    'numberOfContributors(Maintenance)': processContributorsData(repository.commits),
    'documentationCompleteness': analyzeDocumentationCompleteness(repository),
    'weeklyDownloads': rawData.downloads.downloads,
    'githubStars': repository.stargazerCount ?? 0,
    'timeToFirstResponse': timeToFirstResponse,
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
 * Calculate average time to first response for issues (in weeks)
 */
export function calculateTimeToFirstResponse(issues?: GitHubIssue[]): number | undefined {
  if (!issues || issues.length === 0) {
    return undefined;
  }

  const responseTimes: number[] = [];

  for (const issue of issues) {
    if (!issue.author?.login || !issue.comments?.nodes?.length) {
      continue;
    }

    const issueCreatedAt = new Date(issue.createdAt);
    const issueAuthor = issue.author.login;

    // Find first response from someone other than the issue author
    const firstResponse = issue.comments.nodes.find(
      comment => comment.author?.login &&
        comment.author.login !== issueAuthor &&
        !isBotOrAutomated(comment.author.login),
    );

    if (firstResponse) {
      const responseTime = new Date(firstResponse.createdAt);
      const timeDiffMs = responseTime.getTime() - issueCreatedAt.getTime();
      const timeDiffWeeks = timeDiffMs / (1000 * 60 * 60 * 24 * 7);

      if (timeDiffWeeks >= 0) {
        responseTimes.push(timeDiffWeeks);
      }
    }
  }

  if (responseTimes.length === 0) {
    return undefined;
  }

  // Calculate average
  const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  return Math.round(average * 10) / 10; // Round to 1 decimal places for better precision
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
