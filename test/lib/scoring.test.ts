import { categorizeHigherIsBetter, categorizeLowerIsBetter, categorizeByChecklist } from '../../src/lib/scoring';
import { ChecklistItem } from '../../src/lib/types';

describe('scoring functions', () => {
  describe('categorizeHigherIsBetter', () => {
    const thresholds: [number, number, number, number] = [1000, 500, 100, 50];

    test('should return 5 for values above excellent threshold', () => {
      expect(categorizeHigherIsBetter(thresholds, 1500)).toBe(5);
      expect(categorizeHigherIsBetter(thresholds, 1000)).toBe(5);
    });

    test('should return 4 for values in great range', () => {
      expect(categorizeHigherIsBetter(thresholds, 750)).toBe(4);
      expect(categorizeHigherIsBetter(thresholds, 500)).toBe(4);
    });

    test('should return 3 for values in good range', () => {
      expect(categorizeHigherIsBetter(thresholds, 300)).toBe(3);
      expect(categorizeHigherIsBetter(thresholds, 100)).toBe(3);
    });

    test('should return 2 for values in fair range', () => {
      expect(categorizeHigherIsBetter(thresholds, 75)).toBe(2);
      expect(categorizeHigherIsBetter(thresholds, 50)).toBe(2);
    });

    test('should return 1 for values below all thresholds', () => {
      expect(categorizeHigherIsBetter(thresholds, 25)).toBe(1);
      expect(categorizeHigherIsBetter(thresholds, 0)).toBe(1);
    });
  });

  describe('categorizeLowerIsBetter', () => {
    const thresholds: [number, number, number, number] = [1, 5, 10, 20];

    test('should return 5 for values below excellent threshold', () => {
      expect(categorizeLowerIsBetter(thresholds, 0.5)).toBe(5);
      expect(categorizeLowerIsBetter(thresholds, 1)).toBe(5);
    });

    test('should return 4 for values in great range', () => {
      expect(categorizeLowerIsBetter(thresholds, 3)).toBe(4);
      expect(categorizeLowerIsBetter(thresholds, 5)).toBe(4);
    });

    test('should return 3 for values in good range', () => {
      expect(categorizeLowerIsBetter(thresholds, 7)).toBe(3);
      expect(categorizeLowerIsBetter(thresholds, 10)).toBe(3);
    });

    test('should return 2 for values in fair range', () => {
      expect(categorizeLowerIsBetter(thresholds, 15)).toBe(2);
      expect(categorizeLowerIsBetter(thresholds, 20)).toBe(2);
    });

    test('should return 1 for values above all thresholds', () => {
      expect(categorizeLowerIsBetter(thresholds, 25)).toBe(1);
      expect(categorizeLowerIsBetter(thresholds, 100)).toBe(1);
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

    describe('with starting score', () => {
      test('should use starting score of 3 with no adjustments', () => {
        const checklist: Record<string, ChecklistItem> = {
          item1: { present: false, value: 2 },
          item2: { present: false, value: 1 },
        };

        expect(categorizeByChecklist(checklist, 3)).toBe(3);
      });

      test('should add +2 to starting score of 3', () => {
        const checklist: Record<string, ChecklistItem> = {
          verified: { present: true, value: 2 },
        };

        expect(categorizeByChecklist(checklist, 3)).toBe(5);
      });

      test('should subtract -2 from starting score of 3', () => {
        const checklist: Record<string, ChecklistItem> = {
          deprecated: { present: true, value: -2 },
        };

        expect(categorizeByChecklist(checklist, 3)).toBe(1);
      });

      test('should handle multiple adjustments with starting score', () => {
        const checklist: Record<string, ChecklistItem> = {
          majorVersion: { present: true, value: 1 },
          deprecated: { present: true, value: -2 },
          active: { present: false, value: 1 },
        };

        expect(categorizeByChecklist(checklist, 3)).toBe(2);
      });

      test('should ensure minimum of 1 even with negative starting adjustments', () => {
        const checklist: Record<string, ChecklistItem> = {
          majorPenalty: { present: true, value: -5 },
        };

        expect(categorizeByChecklist(checklist, 2)).toBe(1);
      });

      test('should cap at maximum of 5 with high starting score', () => {
        const checklist: Record<string, ChecklistItem> = {
          bonus: { present: true, value: 3 },
        };

        expect(categorizeByChecklist(checklist, 4)).toBe(5);
      });
    });
  });
});