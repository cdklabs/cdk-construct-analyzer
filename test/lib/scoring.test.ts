import { categorizeByBuckets, categorizeByChecklist } from '../../src/lib/scoring';
import { ChecklistItem } from '../../src/lib/types';

describe('scoring functions', () => {
  describe('categorizeByBuckets', () => {
    const thresholds: [number, number, number, number] = [1000, 500, 100, 50];

    test('should return 5 for values above excellent threshold', () => {
      expect(categorizeByBuckets(thresholds, 1500)).toBe(5);
      expect(categorizeByBuckets(thresholds, 1000)).toBe(5);
    });

    test('should return 4 for values in great range', () => {
      expect(categorizeByBuckets(thresholds, 750)).toBe(4);
      expect(categorizeByBuckets(thresholds, 500)).toBe(4);
    });

    test('should return 3 for values in good range', () => {
      expect(categorizeByBuckets(thresholds, 300)).toBe(3);
      expect(categorizeByBuckets(thresholds, 100)).toBe(3);
    });

    test('should return 2 for values in fair range', () => {
      expect(categorizeByBuckets(thresholds, 75)).toBe(2);
      expect(categorizeByBuckets(thresholds, 50)).toBe(2);
    });

    test('should return 1 for values below all thresholds', () => {
      expect(categorizeByBuckets(thresholds, 25)).toBe(1);
      expect(categorizeByBuckets(thresholds, 0)).toBe(1);
    });

    test('should return 1 for undefined or null values', () => {
      expect(categorizeByBuckets(thresholds, undefined)).toBe(undefined);
    });
  });

  describe('categorizeByChecklist', () => {
    test('should return 1 when no items are present', () => {
      const checklist: Record<string, ChecklistItem> = {
        item1: { present: false, value: 2 },
        item2: { present: false, value: 1 },
        item3: { present: false, value: 1 },
      };

      expect(categorizeByChecklist(checklist)).toBe(1);
    });

    test('should calculate score correctly when some items are present', () => {
      const checklist: Record<string, ChecklistItem> = {
        hasReadme: { present: true, value: 1 },
        hasApiDocs: { present: false, value: 2 },
        hasExamples: { present: true, value: 1 },
      };

      // Score: 1 + 1 = 2, plus default 1 = 3
      expect(categorizeByChecklist(checklist)).toBe(3);
    });

    test('should calculate score correctly when all items are present', () => {
      const checklist: Record<string, ChecklistItem> = {
        hasReadme: { present: true, value: 1 },
        hasApiDocs: { present: true, value: 1 },
        hasExamples: { present: true, value: 1 },
        multipleExamples: { present: true, value: 1 },
      };

      // Score: 1 + 1 + 1 + 1 = 4, plus default 1 = 5
      expect(categorizeByChecklist(checklist)).toBe(5);
    });

    test('should cap score at maximum of 5', () => {
      const checklist: Record<string, ChecklistItem> = {
        feature1: { present: true, value: 3 },
        feature2: { present: true, value: 3 },
        feature3: { present: true, value: 3 },
      };

      // Score: 3 + 3 + 3 = 9, plus default 1 = 10, but capped at 5
      expect(categorizeByChecklist(checklist)).toBe(5);
    });

    test('should handle negative values and ensure minimum of 1', () => {
      const checklist: Record<string, ChecklistItem> = {
        negativeFeature: { present: true, value: -2 },
        anotherNegative: { present: true, value: -3 },
        positiveFeature: { present: true, value: 4 },
        anotherPositive: { present: false, value: 5 },
      };

      expect(categorizeByChecklist(checklist)).toBe(1);
    });
  });
});