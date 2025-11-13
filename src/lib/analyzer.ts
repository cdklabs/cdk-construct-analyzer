import { CONFIG } from './config';
import { collectPackageData } from './data/collect';
import type { Config, PackageData, SignalWeights } from './types';

/**
 * Properties analyzer result
 */
export interface ScoreResult {
  readonly packageName: string; // "aws-cdk"
  readonly version: string; // "1.2.3"
  readonly totalScore: number; // 85
  readonly pillarScores: Record<string, number>; // { "popularity": 42 }
  readonly signalScores: Record<string, Record<string, number>>; // { "popularity": { "weeklyDownloads": 4, "githubStars": 2 } }
  readonly signalWeights: Record<string, Record<string, number>>; // { "popularity": { "weeklyDownloads": 3, "githubStars": 2 } }
}

export class ConstructAnalyzer {
  private config: Config;

  constructor() {
    this.config = CONFIG;
  }

  public async analyzePackage(packageName: string, weights?: SignalWeights): Promise<ScoreResult> {
    const packageData = await collectPackageData(packageName);
    const version = packageData.version;

    const { signalScores, pillarScores, totalScore } = await this.calculateSignalScores(packageData, weights);
    const normalizedPillarScores = this.normalizePillarScores(pillarScores, weights);
    const signalWeights = this.getSignalWeights(weights);

    return {
      packageName,
      version,
      totalScore,
      pillarScores: normalizedPillarScores,
      signalScores,
      signalWeights,
    };
  }

  private async calculateSignalScores(packageData: PackageData, weights?: SignalWeights) {
    const signalScores: Record<string, Record<string, number>> = {};
    const pillarScores: Record<string, number> = {};

    for (const pillar of this.config.pillars) {
      for (const signal of pillar.signals) {
        const rawValue = packageData[signal.name];

        const level = signal.benchmarks(rawValue);
        const points = this.convertLevelToPoints(level, signal.name);

        // Use custom weight if provided, otherwise use default weight
        const weight = weights?.[signal.name] ?? signal.defaultWeight;

        this.updateSignalScore(signalScores, pillar.name, signal.name, level ?? 1);
        this.updatePillarScore(pillarScores, pillar.name, points, weight);
      }
    }

    if (totalWeight != 100) {
      console.warn(
        `Warning: Signal weights sum to ${totalWeight} instead of 100. ` +
        'Weights should sum to 100 as it\'s universally understood and can be interpreted as percentages. ' +
        'Weights will be automatically normalized.',
      );
    }

    const totalScore = totalWeight > 0 ? Math.round(totalWeightedSum / totalWeight) : 0;

    return { signalScores, pillarScores, totalScore };
  }

  private convertLevelToPoints(level: number | undefined, signalName: string): number {
    if (level == undefined) {
      console.warn(`Signal data not found: ${signalName}, assigning score of 0`);
      return 0;
    }
    return (level - 1) * 25;
  }

  private updateSignalScore(signalScores: Record<string, Record<string, number>>, pillar: string, signalName: string, starRating: number): void {
    (signalScores[pillar] ??= {})[signalName] = starRating;
  }

  private updatePillarScore(pillarScores: Record<string, number>, pillar: string, points: number, weight: number): void {
    const weightedScore = points * weight;
    pillarScores[pillar] = (pillarScores[pillar] ?? 0) + weightedScore;
  }

  private normalizePillarScores(pillarScores: Record<string, number>, weights?: SignalWeights): Record<string, number> {
    const normalizedScores: Record<string, number> = {};

    const pillarEntries = Object.entries(pillarScores);
    for (const [pillar, weightedSum] of pillarEntries) {
      const totalWeight = this.getTotalWeightForPillar(pillar, weights);
      const normalizedScore = totalWeight > 0 ? Math.min(100, weightedSum / totalWeight) : 0;
      normalizedScores[pillar] = Math.round(normalizedScore);
    }
    return normalizedScores;
  }

  private getTotalWeightForPillar(pillarName: string, weights?: SignalWeights): number {
    const pillar = this.config.pillars.find(p => p.name === pillarName);
    if (!pillar) return 0;

    return pillar.signals.reduce((sum, signal) => {
      const weight = weights?.[signal.name] ?? signal.defaultWeight;
      return sum + weight;
    }, 0);
  }

  /**
   * Extract signal weights from config in the same structure as signalScores
   * Uses custom weights when provided, otherwise falls back to default weights
   */
  private getSignalWeights(weights?: SignalWeights): Record<string, Record<string, number>> {
    const signalWeights: Record<string, Record<string, number>> = {};

    for (const pillar of this.config.pillars) {
      for (const signal of pillar.signals) {
        const weight = weights?.[signal.name] ?? signal.defaultWeight;
        (signalWeights[pillar.name] ??= {})[signal.name] = weight;
      }
    }

    return signalWeights;
  }
}