import { categorizeByBuckets } from './scoring';
import type { Config } from './types';

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
          name: 'weekly_downloads',
          weight: 3.0,
          description: 'Weekly download count from npm',
          benchmarks: (downloads: number) => categorizeByBuckets([2500, 251, 41, 6], downloads),
        },
        {
          name: 'github_stars',
          weight: 2.0,
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
    //       name: 'time_to_first_response',
    //       weight: 3,
    //       description: 'Time to first response on issues',
    //       benchmarks: function,
    //     },
    //   ],
    // },
    // {
    //   name: 'QUALITY',
    //   description: 'Measures the overall quality and reliability of the package',
    //   signals: [
    //     {
    //       name: 'documentation_completeness',
    //       weight: 3,
    //       description: 'Presence of README, API reference, and examples',
    //       benchmarks: function,
    //     },
    //   ],
    // },
  ],
};