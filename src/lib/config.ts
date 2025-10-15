import type { Config } from './types';

/**
 * Main configuration object with all signals and their benchmarks
 */
export const CONFIG: Config = {
  signals: {
    // // MAINTENANCE PILLAR
    // time_to_first_response: {
    //   pillar: 'MAINTENANCE',
    //   weight: 3,
    //   description: 'Time to first response on issues',
    //   benchmarks: {
    //     fiveStars: 7, // 0-1 week (in days)
    //     fourStars: 28, // 1-4 weeks
    //     threeStars: 84, // 4-12 weeks
    //     twoStars: 365, // 3-12 months
    //   },
    // },
    // commit_frequency: {
    //   pillar: 'MAINTENANCE',
    //   weight: 3,
    //   description: 'Number of commits per month',
    //   benchmarks: {
    //     fiveStars: 20, // >20/month
    //     fourStars: 6, // 6-20
    //     threeStars: 1, // 1-5
    //     twoStars: 1, // 0 in 12mo
    //   },
    // },
    // release_frequency: {
    //   pillar: 'MAINTENANCE',
    //   weight: 3,
    //   description: 'Number of releases per year',
    //   benchmarks: {
    //     fiveStars: 55, // >55/yr
    //     fourStars: 34, // 34-54/yr
    //     threeStars: 5, // 5-33/yr
    //     twoStars: 1, // 1-4/yr
    //   },
    // },
    // lockfile_update_recency: {
    //   pillar: 'MAINTENANCE',
    //   weight: 3,
    //   description: 'Days since lockfile was last updated',
    //   benchmarks: {
    //     fiveStars: 30, // <1 month
    //     fourStars: 90, // <3 months
    //     threeStars: 180, // <6 months
    //     twoStars: 365, // <1 year
    //   },
    // },
    // open_issues_ratio: {
    //   pillar: 'MAINTENANCE',
    //   weight: 2,
    //   description: 'Percentage of open issues vs total issues',
    //   benchmarks: {
    //     fiveStars: 25, // <25%
    //     fourStars: 50, // 25-50%
    //     threeStars: 75, // 50-75%
    //     twoStars: 100, // 75%+
    //   },
    // },
    // median_pr_merge_time: {
    //   pillar: 'MAINTENANCE',
    //   weight: 2,
    //   description: 'Median time to merge pull requests (in days)',
    //   benchmarks: {
    //     fiveStars: 7, // <1 week
    //     fourStars: 28, // 1-4 weeks
    //     threeStars: 90, // 1-3 months
    //     twoStars: 180, // 3-6 months
    //   },
    // },
    // number_of_contributors_maintenance: {
    //   pillar: 'MAINTENANCE',
    //   weight: 2.0,
    //   description: 'Number of contributors in the past month (excluding bots)',
    //   benchmarks: {
    //     fiveStars: 4, // ≥4/month
    //     fourStars: 2, // 2-3/month
    //     threeStars: 1, // 1/month
    //     twoStars: 0, // 0/month
    //   },
    // },
    // most_recent_commit: {
    //   pillar: 'MAINTENANCE',
    //   weight: 2,
    //   description: 'Days since most recent commit',
    //   benchmarks: {
    //     fiveStars: 7, // <7 days
    //     fourStars: 30, // 7-30 days
    //     threeStars: 90, // 1-3 months
    //     twoStars: 180, // 3-6 months
    //   },
    // },
    // // QUALITY PILLAR
    // documentation_completeness: {
    //   pillar: 'QUALITY',
    //   weight: 3,
    //   description: 'Presence of README, API reference, and examples',
    //   benchmarks: {
    //     fiveStars: 4, // README = 2 points
    //     fourStars: 3, // API = 1 point
    //     threeStars: 2, // Examples = 1 point
    //     twoStars: 1, //  Total of 4 points
    //   },
    // },
    // test_coverage: {
    //   pillar: 'QUALITY',
    //   weight: 3,
    //   description: 'Presence of unit tests and snapshot tests',
    //   benchmarks: {
    //     fiveStars: 2, // Unit + Snapshot
    //     fourStars: 1, // One type
    //     threeStars: 1, // One type
    //     twoStars: 1, // Filler
    //   },
    // },
    // ci_build_status: {
    //   pillar: 'QUALITY',
    //   weight: 3,
    //   description: 'CI build passing status',
    //   benchmarks: {
    //     fiveStars: 1, // Passing
    //     fourStars: 1, // Filler
    //     threeStars: 1, // Filler
    //     twoStars: 1, // Filler
    //   },
    // },
    // author_track_record: {
    //   pillar: 'QUALITY',
    //   weight: 3,
    //   description: 'Number of packages published by author',
    //   benchmarks: {
    //     fiveStars: 20, // 20+ packages
    //     fourStars: 11, // 11-20
    //     threeStars: 5, // 5-10
    //     twoStars: 2, // 2-4
    //   },
    // },
    // changelog_present: {
    //   pillar: 'QUALITY',
    //   weight: 3,
    //   description: 'Presence of changelog file',
    //   benchmarks: {
    //     fiveStars: 1, // Present
    //     fourStars: 1, // Filler
    //     threeStars: 1, // Filler
    //     twoStars: 1, // Filler
    //   },
    // },
    // stable_versioning: {
    //   pillar: 'QUALITY',
    //   weight: 2,
    //   description: 'Version stability and activity status',
    //   benchmarks: {
    //     fiveStars: 2, // ≥1.x.x & active
    //     fourStars: 1, // <1.0 & active
    //     threeStars: 1, // <1.0 & active
    //     twoStars: 1, // Filler
    //   },
    // },
    // license_and_gitignore: {
    //   pillar: 'QUALITY',
    //   weight: 1,
    //   description: 'Presence of license and .gitignore/.npmignore',
    //   benchmarks: {
    //     fiveStars: 2, // Both present
    //     fourStars: 2, // Filler
    //     threeStars: 1, // One present
    //     twoStars: 1, // Filler
    //   },
    // },
    // multi_language_support: {
    //   pillar: 'QUALITY',
    //   weight: 1,
    //   description: 'Number of supported programming languages',
    //   benchmarks: {
    //     fiveStars: 4, // 4+ languages
    //     fourStars: 3, // 3 languages
    //     threeStars: 2, // 2 languages
    //     twoStars: 1, // 1 language
    //   },
    // },
    // POPULARITY PILLAR
    weekly_downloads: {
      pillar: 'POPULARITY',
      weight: 3.0,
      description: 'Weekly download count from npm',
      benchmarks: {
        fiveStars: 2500, // 2.5k+
        fourStars: 251, // 251-2.5k
        threeStars: 41, // 41-250
        twoStars: 6, // 6-40
      },
    },
    github_stars: {
      pillar: 'POPULARITY',
      weight: 2.0,
      description: 'GitHub repository stars',
      benchmarks: {
        fiveStars: 638, // ≥638
        fourStars: 28, // 28-637
        threeStars: 4, // 4-27
        twoStars: 1, // 1-3
      },
    },
    // number_of_contributors_popularity: {
    //   pillar: 'POPULARITY',
    //   weight: 1.0,
    //   description: 'GitHub contributors',
    //   benchmarks: {
    //     fiveStars: 4, // ≥4/month
    //     fourStars: 2, // 2-3/month
    //     threeStars: 1, // 1/month
    //     twoStars: 1, // filler
    //   },
    // },
  },
};