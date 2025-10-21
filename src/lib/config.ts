import { categorizeByBuckets, categorizeByChecklist } from './scoring';
import type { Config, DocumentationCompleteness } from './types';

/**
 * Main configuration object with all signals and their benchmarks
 */
export const CONFIG: Config = {
  pillars: [
    {
      name: 'POPULARITY',
      description: 'Measures how widely adopted and used the package is',
      signals: [
        {
          name: 'weeklyDownloads',
          weight: 3,
          description: 'Weekly download count from npm',
          benchmarks: (downloads: number) => categorizeByBuckets([2500, 251, 41, 6], downloads),
        },
        {
          name: 'githubStars',
          weight: 2,
          description: 'GitHub repository stars',
          benchmarks: (stars: number) => categorizeByBuckets([638, 28, 4, 1], stars),
        },
      ],
    },
    // {
    //   name: 'MAINTENANCE',
    //   description: 'Measures how actively maintained and updated the package is',
    //   signals: [
    //     {
    //       name: 'timeToFirstResponse',
    //       weight: 3,
    //       description: 'Time to first response on issues',
    //       benchmarks: function,
    //     },
    //   ],
    // },
    {
      name: 'QUALITY',
      description: 'Measures the overall quality and reliability of the package',
      signals: [
        {
          name: 'documentationCompleteness',
          weight: 3,
          description: 'Presence of README, API reference, and usage examples',
          benchmarks: (docData: DocumentationCompleteness) => categorizeByChecklist(
            {
              readme: { present: docData.hasReadme, value: 1 },
              apiDocs: { present: docData.hasApiDocs, value: 1 },
              examples: { present: docData.hasExamples, value: 1 },
              multipleExamples: { present: docData.multipleExamples, value: 1 },
            },
          ),
        },
      ],
    },
  ],
};