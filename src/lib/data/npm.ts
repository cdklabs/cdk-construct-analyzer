//TODO: Add more fields as more signals are added
export interface NpmPackageData {
  readonly name: string;
  readonly version: string;
  readonly repository?: {
    type: string;
    url: string;
  };
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
    this.packageData = {
      name: response.name,
      version: response['dist-tags']?.latest,
      repository: response.repository,
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

  async getDownloadData(): Promise<NpmDownloadData> {
    return this.fetchDownloadData();
  }
}