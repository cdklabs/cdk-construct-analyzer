//TODO: Add more fields as more signals are added
export interface NpmPackageData {
  readonly name: string;
  readonly version: string;
  readonly repository: {
    type: string;
    url: string;
  };
  readonly isDeprecated: boolean;
  readonly hasProvenance?: boolean;
  readonly packageJson?: any;
  readonly maintainers?: Array<{ name: string }>;
}

export interface NpmDownloadData {
  readonly downloads: number;
}

export class NpmCollector {
  private packageData?: NpmPackageData;

  async fetchPackage(packageName: string): Promise<void> {
    const packageRes = await fetch(`https://registry.npmjs.org/${packageName}`);

    if (!packageRes.ok) {
      throw new Error(`NPM registry returned ${packageRes.status}: ${packageRes.statusText}`);
    }

    // Extract only the fields we need from the API response
    const response = await packageRes.json() as any;
    const latestVersion = response['dist-tags']?.latest;

    const versionData = response.versions?.[latestVersion];
    const hasProvenance = Boolean(versionData?.dist?.attestations?.url);

    this.packageData = {
      name: response.name,
      version: latestVersion,
      repository: response.repository,
      isDeprecated: Boolean(versionData?.deprecated),
      hasProvenance,
      packageJson: versionData,
      maintainers: response.maintainers,
    };
  }

  getPackageData(): NpmPackageData {
    if (!this.packageData) {
      throw new Error('Must call fetchPackage() first');
    }
    return this.packageData;
  }

  async fetchDownloadData(): Promise<NpmDownloadData> {
    if (!this.packageData) {
      throw new Error('Must call fetchPackage() first');
    }

    const response = await fetch(`https://api.npmjs.org/downloads/point/last-week/${this.packageData.name}`);
    if (!response.ok) {
      throw new Error(`NPM downloads API returned ${response.status}: ${response.statusText}`);
    }

    return await response.json() as NpmDownloadData;
  }

  async fetchAuthorPackageCount(): Promise<number | undefined> {
    // Get the best (highest package count) maintainer
    const maintainers = this.packageData?.maintainers;
    if (!maintainers || maintainers.length === 0) {
      return undefined;
    }

    try {
      const counts = await Promise.all(
        maintainers.map(async (maintainer) => {
          if (!maintainer?.name) {
            return 0;
          }
          try {
            const response = await fetch(`https://registry.npmjs.org/-/v1/search?text=maintainer:${encodeURIComponent(maintainer.name)}&size=1`);
            if (!response.ok) {
              return undefined;
            }
            const data = await response.json() as any;

            return data.total ?? 0;
          } catch {
            return 0;
          }
        }),
      );
      const maxCount = Math.max(...counts);
      // Return undefined if all requests failed
      return maxCount > 0 ? maxCount : undefined;
    } catch {
      return undefined;
    }
  }
}