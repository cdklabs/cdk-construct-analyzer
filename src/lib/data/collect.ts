import { PackageData, GitHubRepository } from '../types';
import { GitHubRepo } from './github-repo';
import { NpmCollector, NpmPackageData, NpmDownloadData } from './npm';
import {
  extractRepoInfo,
  processContributorsData,
  analyzeDocumentationCompleteness,
  analyzeTestsPresence,
  analyzeReleaseNotesContent,
  countFeatsAndFixes,
  calculateTimeToFirstResponse,
  calculateReleaseFrequency,
  calculateOpenIssuesRatio,
  analyzeJsiiLanguageSupport,
} from '../utils';

/**
 * Raw data fetched from external APIs before processing
 */
interface RawPackageData {
  readonly npm: NpmPackageData;
  readonly downloads: NpmDownloadData;
  readonly authorPackageCount?: number;
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
  const authorPackageCountData = await npmCollector.fetchAuthorPackageCount();

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
    authorPackageCount: authorPackageCountData,
    ...(githubData && { github: githubData }),
  };
}

/**
 * Phase 2: Process raw data into final structured format organized by signal names
 */
function processPackageData(rawData: RawPackageData): PackageData {
  const [majorVersion, minorVersion] = rawData.npm.version.split('.');

  const jsiiLanguageCount = analyzeJsiiLanguageSupport(rawData.npm.packageJson);

  if (!rawData.github) {
    return {
      version: rawData.npm.version,
      weeklyDownloads: rawData.downloads.downloads,
      authorPackageCount: rawData.authorPackageCount,
      stableVersioning: {
        isStableMajorVersion: parseInt(majorVersion, 10) >= 1,
        hasMinorReleases: parseInt(minorVersion, 10) >= 1,
        isDeprecated: rawData.npm.isDeprecated,
      },
      provenanceVerification: rawData.npm.hasProvenance,
      multiLanguageSupport: jsiiLanguageCount,
    };
  }

  const repository = rawData.github;

  return {
    version: rawData.npm.version,
    numberOfContributors_Maintenance: processContributorsData(repository.commits),
    documentationCompleteness: analyzeDocumentationCompleteness(repository),
    testsChecklist: analyzeTestsPresence(repository),
    authorPackageCount: rawData.authorPackageCount,
    releaseNotesIncludeFeatsAndFixes: analyzeReleaseNotesContent(repository),
    weeklyDownloads: rawData.downloads.downloads,
    githubStars: repository.stargazerCount ?? 0,
    stableVersioning: {
      isStableMajorVersion: parseInt(majorVersion, 10) >= 1,
      hasMinorReleases: parseInt(minorVersion, 10) >= 1,
      isDeprecated: rawData.npm.isDeprecated,
    },
    timeToFirstResponse: calculateTimeToFirstResponse(repository.issues),
    provenanceVerification: rawData.npm.hasProvenance,
    numberOfContributors_Popularity: processContributorsData(repository.commits),
    releaseFrequency: calculateReleaseFrequency(repository.releases),
    numberOfFeatsAndFixes: countFeatsAndFixes(repository),
    multiLanguageSupport: jsiiLanguageCount,
    openIssuesRatio: calculateOpenIssuesRatio(repository.openIssuesCount, repository.totalIssuesCount),
  };
}

/**
 * Main entry point: Fetch and process package data
 */
export async function collectPackageData(packageName: string): Promise<PackageData> {
  const rawData = await fetchAllData(packageName);
  return processPackageData(rawData);
}