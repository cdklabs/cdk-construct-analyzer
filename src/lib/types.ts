/**
 * Configuration type definitions for the CDK Construct Analyzer
 */

/**
 * Benchmark function type for converting raw values to quality levels (1-5)
 */
export type BenchmarkFunction = (value: any) => number;

/**
 * Properties of a signal configuration
 */
export interface SignalConfig {
  readonly name: string;
  readonly weight: number;
  readonly description: string;
  readonly benchmarks: BenchmarkFunction;
}

/**
 * Pillar configuration
 */
export interface PillarConfig {
  readonly name: string;
  readonly description: string;
  readonly weight: number;
  readonly signals: SignalConfig[];
}

/**
 * Complete configuration interface
 */
export interface Config {
  readonly pillars: PillarConfig[];
}

/**
 * Checklist item configuration for scoring
 */
export interface ChecklistItem {
  readonly present: boolean;
  readonly value: number;
}

export type PackageData = {
  readonly 'version': string;
  readonly 'numberOfContributors(Maintenance)'?: number;
  readonly 'documentationCompleteness'?: DocumentationCompleteness;
  readonly 'weeklyDownloads'?: number;
  readonly 'githubStars'?: number;
  readonly 'numberOfContributors(Popularity)'?: number;
  readonly 'stableVersioning'?: VersionStability;
  readonly 'timeToFirstResponse'?: number;
  readonly 'provenanceVerification'?: boolean;
} & Record<string, any>;

export type VersionStability = {
  readonly isStableMajorVersion: boolean;
  readonly hasMinorReleases: boolean;
  readonly isDeprecated: boolean;
};

export type DocumentationCompleteness = {
  readonly hasReadme: boolean;
  readonly hasApiDocs: boolean;
  readonly hasExample: boolean;
  readonly multipleExamples: boolean;
};

/**
 * GitHub GraphQL API response types
 */
export interface GitHubRepositoryEntry {
  readonly name: string;
  readonly type: 'blob' | 'tree';
}

export interface GitHubRepositoryContents {
  readonly entries: GitHubRepositoryEntry[];
}

export interface GitHubRepositoryBlob {
  readonly text: string;
}

export interface GitHubCommit {
  readonly author?: {
    readonly user?: {
      readonly login: string;
    };
    readonly email?: string;
  };
}

export interface GitHubIssueComment {
  readonly createdAt: string;
  readonly author?: {
    readonly login: string;
  };
}

export interface GitHubIssue {
  readonly number: number;
  readonly createdAt: string;
  readonly author?: {
    readonly login: string;
  };
  readonly comments: {
    readonly nodes: GitHubIssueComment[];
  };
}

export interface GitHubRepository {
  readonly stargazerCount: number;
  readonly rootContents?: GitHubRepositoryContents;
  readonly readmeContent?: string;
  readonly commits?: GitHubCommit[];
  readonly issues?: GitHubIssue[];
}
