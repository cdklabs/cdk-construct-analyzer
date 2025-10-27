import { CONFIG } from './config';
import { collectPackageData } from './data/collect';
import type { Config, PackageData } from './types';

/**
 * Properties analyzer result
 */
export interface ScoreResult {
  readonly packageName: string; // "aws-cdk"
  readonly version: string; // "1.2.3"
  readonly totalScore: number; // 85
  readonly pillarScores: Record<string, number>; // { "popularity": 42 }
  readonly signalScores: Record<string, Record<string, number>>; // { "popularity": { "weeklyDownloads": 4, "githubStars": 2 } }
}

export class ConstructAnalyzer {
  private config: Config;

  constructor() {
    this.config = CONFIG;
  }

  public async analyzePackage(packageName: string): Promise<ScoreResult> {
    const packageData = await collectPackageData(packageName);
    const version = packageData.version;

    const { signalScores, pillarScores } = await this.calculateSignalScores(packageData);
    const normalizedPillarScores = this.normalizePillarScores(pillarScores);
    const totalScore = this.calculateTotalScore(normalizedPillarScores);

    return {
      packageName,
      version,
      totalScore,
      pillarScores: normalizedPillarScores,
      signalScores,
    };
  }

  private async calculateSignalScores(packageData: PackageData) {
    const signalScores: Record<string, Record<string, number>> = {};
    const pillarScores: Record<string, number> = {};

    for (const pillar of this.config.pillars) {
      for (const signal of pillar.signals) {
        const rawValue = packageData[signal.name];

        if (rawValue === undefined) {
          console.warn(`Signal data not found: ${signal.name}`);
          continue;
        }

        const level = signal.benchmarks(rawValue);
        const points = this.convertLevelToPoints(level);

        this.updateSignalScore(signalScores, pillar.name, signal.name, level);
        this.updatePillarScore(pillarScores, pillar.name, points, signal.weight);
      }
    }

    return { signalScores, pillarScores };
  }

  private convertLevelToPoints(level: number): number {
    return (level - 1) * 25;
  }

  private updateSignalScore(signalScores: Record<string, Record<string, number>>, pillar: string, signalName: string, starRating: number): void {
    (signalScores[pillar] ??= {})[signalName] = starRating;
  }

  private updatePillarScore(pillarScores: Record<string, number>, pillar: string, points: number, weight: number): void {
    const weightedScore = points * weight;
    pillarScores[pillar] = (pillarScores[pillar] ?? 0) + weightedScore;
  }

  private normalizePillarScores(pillarScores: Record<string, number>): Record<string, number> {
    const normalizedScores: Record<string, number> = {};

    const pillarEntries = Object.entries(pillarScores);
    for (const [pillar, weightedSum] of pillarEntries) {
      const totalWeight = this.getTotalWeightForPillar(pillar);
      const normalizedScore = totalWeight > 0 ? Math.min(100, weightedSum / totalWeight) : 0;
      normalizedScores[pillar] = Math.round(normalizedScore);
    }

    return normalizedScores;
  }

  private getTotalWeightForPillar(pillarName: string): number {
    const pillar = this.config.pillars.find(p => p.name === pillarName);
    if (!pillar) return 0;

    return pillar.signals.reduce((sum, signal) => sum + signal.weight, 0);
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
}