import { categorizeByChecklist, categorizeHigherIsBetter, categorizeLowerIsBetter } from './scoring';
import type { Config, DocumentationCompleteness, VersionStability, TestsData, ReleaseNotesData } from './types';

/**
 * Main configuration object with all signals and their benchmarks
 */
export const CONFIG: Config = {
  pillars: [
    {
      name: 'MAINTENANCE',
      description: 'Measures how actively maintained and updated the package is',
      signals: [
        {
          name: 'timeToFirstResponse',
          defaultWeight: 15,
          description: 'Time to first response on issues',
          benchmarks: (weeks: number) => categorizeLowerIsBetter([1, 4, 12, 52], weeks),
        },
        {
          name: 'provenanceVerification',
          defaultWeight: 10,
          description: 'Ensures supply chain security through provenance verification',
          benchmarks: (verified: boolean) => categorizeByChecklist({
            versionVerified: { present: verified, value: 4 },
          }),
        },
        {
          name: 'releaseFrequency',
          defaultWeight: 10,
          description: 'Number of releases in the past year',
          benchmarks: (releases: number) => categorizeHigherIsBetter([55, 34, 5, 1], releases),
        },
        {
          name: 'numberOfContributors_Maintenance',
          defaultWeight: 10,
          description: 'Number of Contributors in the past year',
          benchmarks: (contributors: number) => categorizeHigherIsBetter([8, 2, 1, 1], contributors),
        },
      ],
    },
    {
      name: 'QUALITY',
      description: 'Measures the overall quality and reliability of the package',
      signals: [
        {
          name: 'documentationCompleteness',
          defaultWeight: 5,
          description: 'Presence of README, API reference, and usage examples',
          benchmarks: (docData: DocumentationCompleteness) => categorizeByChecklist(
            {
              readme: { present: docData.hasReadme, value: 1 },
              apiDocs: { present: docData.hasApiDocs, value: 1 },
              oneExample: { present: docData.hasExample, value: 1 },
              multipleExamples: { present: docData.multipleExamples, value: 1 },
            },
          ),
        },
        {
          name: 'testsChecklist',
          defaultWeight: 5,
          description: 'Presence of unit tests and snapshot tests',
          benchmarks: (testsData: TestsData) => categorizeByChecklist({
            unitTests: { present: testsData.hasUnitTests, value: 2 },
            snapshotTests: { present: testsData.hasSnapshotTests, value: 2 },
          }),
        },
        {
          name: 'authorPackageCount',
          defaultWeight: 5,
          description: 'Highest package count among authors',
          benchmarks: (packageCount: number) => categorizeHigherIsBetter([20, 11, 5, 2], packageCount),
        },
        {
          name: 'releaseNotesIncludeFeatsAndFixes',
          defaultWeight: 5,
          description: 'Presence of features and fixes in release notes',
          benchmarks: (releaseNotesData: ReleaseNotesData) => categorizeByChecklist({
            hasFeats: { present: releaseNotesData.hasFeats, value: 2 },
            hasFixes: { present: releaseNotesData.hasFixes, value: 2 },
          }),
        },
        {
          name: 'stableVersioning',
          defaultWeight: 5,
          description: 'Package version stability and deprecation status',
          benchmarks: (versionData: VersionStability) => categorizeByChecklist({
            isStableMajorVersion: { present: versionData.isStableMajorVersion, value: 2 },
            hasMinorReleases: { present: versionData.hasMinorReleases, value: 1 },
            deprecated: { present: versionData.isDeprecated, value: -4 },
          }, 2), // Starting score of 2
        },
        {
          name: 'multiLanguageSupport',
          weight: 3,
          description: 'Number of programming languages supported via jsii (excluding typescript)',
          benchmarks: (languageCount: number) => categorizeHigherIsBetter([4, 3, 2, 1], languageCount),
        },
      ],
    },
    {
      name: 'POPULARITY',
      description: 'Measures how widely adopted and used the package is',
      signals: [
        {
          name: 'weeklyDownloads',
          defaultWeight: 15,
          description: 'Weekly download count from npm',
          benchmarks: (downloads: number) => categorizeHigherIsBetter([2500, 251, 41, 6], downloads),
        },
        {
          name: 'githubStars',
          defaultWeight: 10,
          description: 'GitHub repository stars',
          benchmarks: (stars: number) => categorizeHigherIsBetter([638, 28, 4, 1], stars),
        },
        {
          name: 'numberOfContributors_Popularity',
          defaultWeight: 5,
          description: 'Number of Contributors in the past year',
          benchmarks: (contributors: number) => categorizeHigherIsBetter([8, 2, 1, 1], contributors),
        },
      ],
    },
  ],
};