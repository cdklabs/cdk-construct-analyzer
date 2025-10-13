import { GitHubCollector, GitHubData } from './github';
import { NpmCollector, NpmPackageData, NpmDownloadData } from './npm';

export interface PackageData {
  npm: NpmPackageData;
  downloads: NpmDownloadData;
  github: GitHubData;
}

export async function collectPackageData(packageName: string): Promise<PackageData> {
  // Create collectors
  const npmCollector = new NpmCollector();
  const githubCollector = new GitHubCollector();

  // Fetch NPM data (required)
  await npmCollector.fetchAll(packageName);
  const npmData = npmCollector.getPackageData();
  const downloadData = await npmCollector.getDownloadData();

  // Fetch GitHub data if repository URL exists
  let githubData: GitHubData = { stars: 0 };
  if (npmData.repository?.url) {
    try {
      await githubCollector.fetchAll(npmData.repository.url);
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

// Re-export types and classes for convenience
export type { NpmPackageData, NpmDownloadData, GitHubData };
export { NpmCollector, GitHubCollector };