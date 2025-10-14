import * as fs from 'fs';
import { collectPackageData } from './data/index';
import { calculateWeeklyDownloads, calculateGithubStars } from './signals/index';

/**
 * Map to signal calculation functions
 */
const SIGNAL_CALCULATOR = {
  weekly_downloads: calculateWeeklyDownloads,
  github_stars: calculateGithubStars,
};

/**
 * Properties of a signal
 */
interface SignalConfig {
  readonly pillar: string;
  readonly weight: number;
  readonly enabled: boolean;
  readonly description: string;
}

/**
 * Properties of a pillar
 */
interface PillarConfig {
  readonly name: string;
  readonly weight: number;
  readonly description: string;
}

/**
 * Properties of a config object
 */
interface Config {
  readonly signals: Record<string, SignalConfig>; // signal name -> signal config
  readonly pillars: Record<string, PillarConfig>; // pillar name -> pillar config
}

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
    const configData = fs.readFileSync('src/lib/config.json', 'utf8');
    this.config = JSON.parse(configData);
  }

  async analyzePackage(packageName: string): Promise<ScoreResult> {
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

    const signal_entries = Object.entries(this.config.signals);
    for (const [signalName, signalConfig] of signal_entries) {
      if (!signalConfig.enabled) continue;

      const calculator = SIGNAL_CALCULATOR[signalName as keyof typeof SIGNAL_CALCULATOR];
      if (!calculator) continue;

      const starRating = await calculator(packageData);
      const points = this.convertStarsToPoints(starRating);

      this.addSignalScore(signalScores, signalConfig.pillar, signalName, starRating);
      this.addPillarScore(pillarScores, signalConfig.pillar, points, signalConfig.weight);
    }

    return { signalScores, pillarScores };
  }

  private convertStarsToPoints(starRating: number): number {
    return (starRating - 1) * 25;
  }

  private addSignalScore(signalScores: Record<string, Record<string, number>>, pillar: string, signalName: string, starRating: number): void {
    (signalScores[pillar] ??= {})[signalName] = starRating;
  }

  private addPillarScore(pillarScores: Record<string, number>, pillar: string, points: number, weight: number): void {
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

  private getTotalWeightForPillar(pillar: string): number {
    return Object.values(this.config.signals)
      .filter(config => config.pillar === pillar && config.enabled)
      .reduce((sum, config) => sum + config.weight, 0);
  }

  private calculateTotalScore(pillarScores: Record<string, number>): number {
    const scores = Object.values(pillarScores);
    if (scores.length === 0) return 0;

    const sum = scores.reduce((total, score) => total + score, 0);
    return sum / scores.length;
  }


}