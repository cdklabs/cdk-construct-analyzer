import { categorizeByChecklist, categorizeHigherIsBetter, categorizeLowerIsBetter } from './scoring';
import type { Config, DocumentationCompleteness, VersionStability } from './types';

/**
 * Main configuration object with all signals and their benchmarks
 */
export const CONFIG: Config = {
  pillars: [
    {
      name: 'MAINTENANCE',
      description: 'Measures how actively maintained and updated the package is',
      weight: 0.33,
      signals: [
        {
          name: 'timeToFirstResponse',
          weight: 3,
          description: 'Time to first response on issues',
          benchmarks: (weeks: number) => categorizeLowerIsBetter([1, 4, 12, 52], weeks),
        },
        {
          name: 'releaseFrequency',
          weight: 3,
          description: 'Number of releases in the past year',
          benchmarks: (releases: number) => categorizeHigherIsBetter([55, 34, 5, 1], releases),
        },
        {
          name: 'provenanceVerification',
          weight: 3,
          description: 'Ensures supply chain security through provenance verification',
          benchmarks: (verified: boolean) => categorizeByChecklist({
            versionVerified: { present: verified, value: 4 },
          }),
        },
        {
          name: 'numberOfContributors(Maintenance)',
          weight: 2,
          description: 'Number of Contributors in the past year',
          benchmarks: (contributors: number) => categorizeHigherIsBetter([8, 2, 1, 1], contributors),
        },
      ],
    },
    {
      name: 'QUALITY',
      description: 'Measures the overall quality and reliability of the package',
      weight: 0.33,
      signals: [
        {
          name: 'documentationCompleteness',
          weight: 3,
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
          name: 'stableVersioning',
          weight: 2,
          description: 'Package version stability and deprecation status',
          benchmarks: (versionData: VersionStability) => categorizeByChecklist({
            isStableMajorVersion: { present: versionData.isStableMajorVersion, value: 2 },
            hasMinorReleases: { present: versionData.hasMinorReleases, value: 1 },
            deprecated: { present: versionData.isDeprecated, value: -4 },
          }, 2), // Starting score of 2
        },
      ],
    },
    {
      name: 'POPULARITY',
      description: 'Measures how widely adopted and used the package is',
      weight: 0.33,
      signals: [
        {
          name: 'weeklyDownloads',
          weight: 3,
          description: 'Weekly download count from npm',
          benchmarks: (downloads: number) => categorizeHigherIsBetter([2500, 251, 41, 6], downloads),
        },
        {
          name: 'githubStars',
          weight: 2,
          description: 'GitHub repository stars',
          benchmarks: (stars: number) => categorizeHigherIsBetter([638, 28, 4, 1], stars),
        },
        {
          name: 'numberOfContributors(Popularity)',
          weight: 1,
          description: 'Number of Contributors in the past year',
          benchmarks: (contributors: number) => categorizeHigherIsBetter([8, 2, 1, 1], contributors),
        },
      ],
    },
  ],
};