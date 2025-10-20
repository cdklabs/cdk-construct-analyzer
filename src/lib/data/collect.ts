import { GitHubCollector, GitHubData } from './github';
import { NpmCollector, NpmPackageData, NpmDownloadData } from './npm';

export interface PackageData {
  readonly npm: NpmPackageData;
  readonly downloads: NpmDownloadData;
  readonly github: GitHubData;
}

export async function collectPackageData(packageName: string): Promise<PackageData> {
  // Create collectors
  const npmCollector = new NpmCollector();
  const githubCollector = new GitHubCollector();

  // Fetch NPM data (required)
  await npmCollector.fetchPackage(packageName);
  const npmData = npmCollector.getPackageData();
  const downloadData = await npmCollector.getDownloadData();

  // Fetch GitHub data if repository URL exists
  let githubData: GitHubData = { stars: 0 };
  if (npmData.repository?.url) {
    try {
      await githubCollector.fetchPackage(npmData.repository.url);
      githubData = githubCollector.getData();
    } catch (error) {
      console.warn(`GitHub fetch failed: ${error}`);
    }
  } else {
    console.log('No repository URL found in NPM data');
  }

  return {
    npm: npmData,
    downloads: downloadData,
    github: githubData,
  };
}

/**
 * Signal calculation functions that return raw numeric values
 */
export function calculateWeeklyDownloads(packageData: PackageData): number {
  return packageData.downloads.downloads;
}

export function calculateGithubStars(packageData: PackageData): number {
  return packageData.github.stars;
}

export function calculateTimeToFirstResponse(packageData: PackageData): number {
  return packageData.github.timeToFirstResponseWeeks ?? 999; // Default to very high value if no data
}

export const signalCalculators = {
  weekly_downloads: calculateWeeklyDownloads,
  github_stars: calculateGithubStars,
  time_to_first_response: calculateTimeToFirstResponse,
};

// Re-export types and classes for convenience
export type { NpmPackageData, NpmDownloadData, GitHubData };
export { NpmCollector, GitHubCollector };