import { CONFIG } from './config';
import { collectPackageData } from './data/collect';
import type { Config, PackageData, CustomSignalWeights } from './types';

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

  public async analyzePackage(packageName: string, customWeights?: CustomSignalWeights): Promise<ScoreResult> {
    const packageData = await collectPackageData(packageName);
    const version = packageData.version;

    const { signalScores, pillarScores } = await this.calculateSignalScores(packageData, customWeights);
    const normalizedPillarScores = this.normalizePillarScores(pillarScores, customWeights);
    const totalScore = this.calculateTotalScore(normalizedPillarScores);
    const signalWeights = this.getSignalWeights(customWeights);

    return {
      packageName,
      version,
      totalScore,
      pillarScores: normalizedPillarScores,
      signalScores,
      signalWeights,
    };
  }

  private async calculateSignalScores(packageData: PackageData, customWeights?: CustomSignalWeights) {
    const signalScores: Record<string, Record<string, number>> = {};
    const pillarScores: Record<string, number> = {};

    for (const pillar of this.config.pillars) {
      for (const signal of pillar.signals) {
        const rawValue = packageData[signal.name];

        const level = signal.benchmarks(rawValue);
        const points = this.convertLevelToPoints(level, signal.name);

        // Use custom weight if provided, otherwise use default weight
        const weight = customWeights?.[signal.name] ?? signal.weight;

        this.updateSignalScore(signalScores, pillar.name, signal.name, level ?? 1);
        this.updatePillarScore(pillarScores, pillar.name, points, weight);
      }
    }

    return { signalScores, pillarScores };
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

  private normalizePillarScores(pillarScores: Record<string, number>, customWeights?: CustomSignalWeights): Record<string, number> {
    const normalizedScores: Record<string, number> = {};

    const pillarEntries = Object.entries(pillarScores);
    for (const [pillar, weightedSum] of pillarEntries) {
      const totalWeight = this.getTotalWeightForPillar(pillar, customWeights);
      const normalizedScore = totalWeight > 0 ? Math.min(100, weightedSum / totalWeight) : 0;
      normalizedScores[pillar] = Math.round(normalizedScore);
    }

    return normalizedScores;
  }

  private getTotalWeightForPillar(pillarName: string, customWeights?: CustomSignalWeights): number {
    const pillar = this.config.pillars.find(p => p.name === pillarName);
    if (!pillar) return 0;

    return pillar.signals.reduce((sum, signal) => {
      const weight = customWeights?.[signal.name] ?? signal.weight;
      return sum + weight;
    }, 0);
  }

  private calculateTotalScore(pillarScores: Record<string, number>): number {
    if (Object.keys(pillarScores).length === 0) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    for (const [pillarName, score] of Object.entries(pillarScores)) {
      const pillar = this.config.pillars.find(p => p.name === pillarName);
      if (pillar) {
        weightedSum += score * pillar.weight;
        totalWeight += pillar.weight;
      }
    }

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  /**
   * Extract signal weights from config in the same structure as signalScores
   * Uses custom weights when provided, otherwise falls back to default weights
   */
  private getSignalWeights(customWeights?: CustomSignalWeights): Record<string, Record<string, number>> {
    const signalWeights: Record<string, Record<string, number>> = {};

    for (const pillar of this.config.pillars) {
      for (const signal of pillar.signals) {
        const weight = customWeights?.[signal.name] ?? signal.weight;
        (signalWeights[pillar.name] ??= {})[signal.name] = weight;
      }
    }

    return signalWeights;
  }
}