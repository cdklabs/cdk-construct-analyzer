import { ChecklistItem } from './types';

/**
 * Categorizes a numeric value into quality levels (1-5) where higher values are better
 * @param thresholds Array of 4 numbers [excellent, great, good, fair] in descending order
 * @param value The value to categorize
 * @returns Quality level from 1 (poor) to 5 (excellent), or undefined if value is undefined
 */
export function categorizeHigherIsBetter(thresholds: [number, number, number, number], value: number | undefined): number | undefined {
  if (value == undefined) return undefined;

  const [five, four, three, two] = thresholds;

  if (value >= five) return 5;
  if (value >= four) return 4;
  if (value >= three) return 3;
  if (value >= two) return 2;
  return 1; // default
}

/**
 * Categorizes a numeric value into quality levels (1-5) where lower values are better
 * @param thresholds Array of 4 numbers [excellent, great, good, fair] in ascending order
 * @param value The value to categorize
 * @returns Quality level from 1 (poor) to 5 (excellent)
 */
export function categorizeLowerIsBetter(thresholds: [number, number, number, number], value: number): number {
  const [five, four, three, two] = thresholds;

  if (value <= five) return 5;
  if (value <= four) return 4;
  if (value <= three) return 3;
  if (value <= two) return 2;
  return 1; // default
}

/**
 * Categorizes based on a weighted checklist score
 * @param checklist Object with items and their weights
 * @param startingScore Optional starting score (default: 0)
 * @returns Quality level from 1 (poor) to 5 (excellent)
 */
export function categorizeByChecklist<T extends Record<string, ChecklistItem>>(
  checklist: T,
  startingScore: number = 1,
): number {
  const totalScore = Object.values(checklist).reduce((sum, item) => {
    return sum + (item.present ? item.value : 0);
  }, startingScore);

  return Math.max(1, Math.min(totalScore, 5)); // min 1, max 5
}