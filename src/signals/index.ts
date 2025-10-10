import { calculateWeeklyDownloads, calculateGithubStars } from './popularity';

export const signalCalculators = {
  weekly_downloads: calculateWeeklyDownloads,
  github_stars: calculateGithubStars,
};