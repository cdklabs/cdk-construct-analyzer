import { CONFIG } from './config';
import { collectPackageData, signalCalculators } from './data/collect';
import type { Config, BenchmarkConfig, BenchmarkFunction } from './types';

/**
 * Properties analyzer result
 */
export interface ScoreResult {
  readonly packageName: string; // "aws-cdk"
  readonly version: string; // "1.2.3"
  readonly totalScore: number; // 85
  readonly pillarScores: Record<string, number>; // { "popularity": 42 }
  readonly signalScores: Record<string, Record<string, number>>; // { "popularity": { "weekly_downloads": 4, "github_stars": 2 } }
}

export class ConstructAnalyzer {
  private config: Config;

  constructor() {
    this.config = CONFIG;
  }

  public async analyzePackage(packageName: string): Promise<ScoreResult> {
    const packageData = await collectPackageData(packageName);
    const version = packageData.npm.version;

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

  private async calculateSignalScores(packageData: any) {
    const signalScores: Record<string, Record<string, number>> = {};
    const pillarScores: Record<string, number> = {};

    for (const pillar of this.config.pillars) {
      for (const signal of pillar.signals) {
        const calculator = signalCalculators[signal.name as keyof typeof signalCalculators];
        if (!calculator) continue;

        const rawValue = calculator(packageData);
        const level = this.convertValueToLevel(rawValue, signal.benchmarks);
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

  private convertValueToLevel(value: number, benchmarks: BenchmarkConfig | BenchmarkFunction): number {
    // If benchmarks is a function, call it directly
    if (typeof benchmarks === 'function') {
      return benchmarks(value);
    }

    // Otherwise, use the object-based approach
    if (value >= benchmarks.five) return 5;
    if (value >= benchmarks.four) return 4;
    if (value >= benchmarks.three) return 3;
    if (value >= benchmarks.two) return 2;
    return 1; // one (default)
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

    const pillar_entries = Object.entries(pillarScores);
    for (const [pillar, weightedSum] of pillar_entries) {
      const totalWeight = this.getTotalWeightForPillar(pillar);
      const normalizedScore = totalWeight > 0 ? Math.min(100, weightedSum / totalWeight) : 0;
      normalizedScores[pillar] = normalizedScore;
    }

    return normalizedScores;
  }

  private getTotalWeightForPillar(pillarName: string): number {
    const pillar = this.config.pillars.find(p => p.name === pillarName);
    if (!pillar) return 0;

    return pillar.signals.reduce((sum, signal) => sum + signal.weight, 0);
  }

  private calculateTotalScore(pillarScores: Record<string, number>): number {
    const scores = Object.values(pillarScores);
    if (scores.length === 0) return 0;

    const sum = scores.reduce((total, score) => total + score, 0);
    return sum / scores.length;
  }
}