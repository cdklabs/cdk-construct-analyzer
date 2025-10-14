import { PackageData } from '../data/collect';

export async function calculateWeeklyDownloads(packageData: PackageData): Promise<number> {
  const downloads = packageData.downloads.downloads || 0;

  let stars = 1;
  if (downloads >= 2500) stars = 5;
  else if (downloads >= 251) stars = 4;
  else if (downloads >= 41) stars = 3;
  else if (downloads >= 6) stars = 2;
  else stars = 1;

  return stars;
}

export async function calculateGithubStars(packageData: PackageData): Promise<number> {
  const githubStars = packageData.github.stars || 0;

  let stars = 1;
  if (githubStars >= 638) stars = 5;
  else if (githubStars >= 28) stars = 4;
  else if (githubStars >= 4) stars = 3;
  else if (githubStars >= 1) stars = 2;
  else stars = 1;

  return stars;
}