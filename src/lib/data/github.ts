export interface GitHubRawData {
  readonly stars: number;
  readonly repoContents: Record<string, boolean>; // path -> exists
  readonly readmeContent: string | null; // README file content
}

function extractRepoInfo(repositoryUrl: string): { owner: string; repo: string } | null {
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
  return null;
}

export class GitHubCollector {
  private rawData?: GitHubRawData;

  async fetchPackage(repositoryUrl: string): Promise<void> {
    const repoInfo = extractRepoInfo(repositoryUrl);
    if (!repoInfo) {
      throw new Error(`Could not parse GitHub URL: ${repositoryUrl}`);
    }

    try {
      // Fetch basic repo data
      const response = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`);
      if (!response.ok) {
        throw new Error(`GitHub API returned ${response.status}`);
      }

      const fullResponse = await response.json() as any;
      const starCount = fullResponse.stargazers_count || 0;

      // Fetch all file/directory existence data
      const repoContents = await this.fetchAllRepoContents(repoInfo.owner, repoInfo.repo);

      // Fetch README content using the discovered files
      const readmeContent = await this.fetchReadmeContent(repoInfo.owner, repoInfo.repo, repoContents);

      this.rawData = {
        stars: starCount,
        repoContents,
        readmeContent,
      };
    } catch (error) {
      throw new Error(`GitHub fetch failed: ${error}`);
    }
  }

  private async fetchAllRepoContents(owner: string, repo: string): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    const visitedPaths = new Set<string>();

    try {
      // Start recursive fetch from root
      await this.fetchDirectoryContentsRecursive(owner, repo, '', results, visitedPaths);
    } catch (error) {
      console.warn(`Failed to fetch repository contents: ${error}`);
    }

    return results;
  }

  private async fetchDirectoryContentsRecursive(
    owner: string,
    repo: string,
    path: string,
    results: Record<string, boolean>,
    visitedPaths: Set<string>,
    maxDepth: number = 3,
    currentDepth: number = 0,
  ): Promise<void> {
    // Prevent infinite recursion and limit depth, also should not need
    // to recurse more than 3 layers for the  documentation?
    if (currentDepth >= maxDepth || visitedPaths.has(path)) {
      return;
    }

    visitedPaths.add(path);

    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`);
      if (!response.ok) return;

      const data = await response.json() as any;
      if (!Array.isArray(data)) return;

      // Process all items in parallel
      const directoryPromises: Promise<void>[] = [];

      for (const item of data) {
        const itemPath = path ? `${path}/${item.name}` : item.name;
        results[itemPath] = true;

        // Also add just the filename for easier matching
        results[item.name] = true;

        // If it's a directory, recursively fetch its contents
        if (item.type === 'dir') {
          directoryPromises.push(
            this.fetchDirectoryContentsRecursive(
              owner,
              repo,
              itemPath,
              results,
              visitedPaths,
              maxDepth,
              currentDepth + 1,
            ),
          );
        }
      }

      // Wait for all subdirectory fetches to complete
      await Promise.all(directoryPromises);
    } catch (error) {
      // Silently fail for individual directory fetches
    }
  }

  private async fetchReadmeContent(owner: string, repo: string, repoContents: Record<string, boolean>): Promise<string | null> {
    // Find README file from the repository contents
    const readmeFile = Object.keys(repoContents).find(path =>
      path.toLowerCase().includes('readme') && !path.includes('/'),
    );

    if (!readmeFile) {
      return null;
    }

    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${readmeFile}`);
      if (response.ok) {
        const data = await response.json() as any;
        if (data.content && data.encoding === 'base64') {
          return atob(data.content);
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch README content: ${error}`);
    }

    return null;
  }

  getRawData(): GitHubRawData {
    if (!this.rawData) {
      throw new Error('Must call fetchPackage() first');
    }
    return this.rawData;
  }
}