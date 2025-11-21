/**
 * Configuration type definitions for the CDK Construct Analyzer
 */

import type { Pillar } from './config';

/**
 * Properties analyzer result
 */
export interface ScoreResult {
  readonly packageName: string; // "aws-cdk"
  readonly version: string; // "1.2.3"
  readonly totalScore: number; // 85
  readonly pillarScores: Readonly<PillarScores>; // { "MAINTENANCE": 42, "QUALITY": 85, "POPULARITY": 67 }
  readonly signalScores: Record<string, Record<string, number>>; // { "popularity": { "weeklyDownloads": 4, "githubStars": 2 } }
  readonly signalWeights: Record<string, Record<string, number>>; // { "popularity": { "weeklyDownloads": 3, "githubStars": 2 } }
}

/**
 * Benchmark function type for converting raw values to quality levels (1-5)
 */
export type BenchmarkFunction = (value: any) => number | undefined;

/**
 * Properties of a signal configuration
 */
export interface SignalConfig {
  readonly name: string;
  readonly defaultWeight: number;
  readonly description: string;
  readonly benchmarks: BenchmarkFunction;
}

/**
 * Pillar configuration
 */
export interface PillarConfig {
  readonly name: string;
  readonly description: string;
  readonly signals: SignalConfig[];
}

/**
 * Complete configuration interface
 */
export interface Config {
  readonly pillars: PillarConfig[];
}

/**
 * Pillar scores for the three main evaluation pillars
 * Dynamically generated from Pillar enum
 */
export type PillarScores = {
  [K in Pillar]: number;
};

export type SignalWeights = Record<string, number>;

/**
 * Checklist item configuration for scoring
 */
export interface ChecklistItem {
  readonly present: boolean;
  readonly value: number;
}

export type PackageData = {
  readonly version: string;
  readonly numberOfContributors_Maintenance?: number;
  readonly documentationCompleteness?: DocumentationCompleteness;
  readonly testsChecklist?: TestsData;
  readonly authorTrackRecord?: number;
  readonly releaseNotesIncludeFeatsAndFixes?: ReleaseNotesData;
  readonly weeklyDownloads?: number;
  readonly githubStars?: number;
  readonly numberOfContributors_Popularity?: number;
  readonly stableVersioning?: VersionStability;
  readonly timeToFirstResponse?: number;
  readonly provenanceVerification?: boolean;
  readonly releaseFrequency?: number;
  readonly numberOfFeatsAndFixes?: number;
  readonly multiLanguageSupport?: number;
  readonly openIssuesRatio?: number;
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

export type TestsData = {
  readonly hasUnitTests: boolean;
  readonly hasSnapshotTests: boolean;
};

export type ReleaseNotesData = {
  readonly hasFeats: boolean;
  readonly hasFixes: boolean;
};

/**
 * GitHub GraphQL API response types
 */
export interface GitHubRepositoryEntry {
  readonly name: string;
  readonly type: 'blob' | 'tree';
  readonly object?: GitHubRepositoryContents;
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

export interface GitHubRelease {
  readonly publishedAt: string;
  readonly tagName: string;
  readonly description?: string;
}

export interface GitHubRepository {
  readonly stargazerCount: number;
  readonly rootContents?: GitHubRepositoryContents;
  readonly readmeContent?: string;
  readonly commits?: GitHubCommit[];
  readonly issues?: GitHubIssue[];
  readonly releases?: GitHubRelease[];
  readonly openIssuesCount?: number;
  readonly totalIssuesCount?: number;
}
