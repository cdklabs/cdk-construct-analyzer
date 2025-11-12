import { CONFIG } from './config';
import { collectPackageData } from './data/collect';
import type { ScoreResult, Config, PackageData, PillarScores } from './types';

export class ConstructAnalyzer {
  private config: Config;

  constructor() {
    this.config = CONFIG;
  }

  public async analyzePackage(packageName: string): Promise<ScoreResult> {
    const packageData = await collectPackageData(packageName);
    const { signalScores, pillarScores } = await this.calculateSignalScores(packageData);
    const normalizedPillarScores = this.normalizePillarScores(pillarScores);

    return {
      packageName,
      version: packageData.version,
      totalScore: this.calculateTotalScore(normalizedPillarScores),
      pillarScores: normalizedPillarScores,
      signalScores,
      signalWeights: this.getSignalWeights(),
    };
  }

  private async calculateSignalScores(packageData: PackageData) {
    const signalScores: Record<string, Record<string, number>> = {};
    const pillarScores: PillarScores = { MAINTENANCE: 0, QUALITY: 0, POPULARITY: 0 };

    for (const pillar of this.config.pillars) {
      for (const signal of pillar.signals) {
        const level = signal.benchmarks(packageData[signal.name]);
        const points = this.convertLevelToPoints(level, signal.name);

        (signalScores[pillar.name] ??= {})[signal.name] = level ?? 1;
        pillarScores[pillar.name as keyof PillarScores] += points * signal.weight;
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

  private normalizePillarScores(pillarScores: PillarScores): PillarScores {
    const normalize = (pillar: keyof PillarScores): number => {
      const totalWeight = this.config.pillars
        .find(p => p.name === pillar)
        ?.signals.reduce((sum, signal) => sum + signal.weight, 0) ?? 0;

      return totalWeight > 0
        ? Math.round(Math.min(100, pillarScores[pillar] / totalWeight))
        : 0;
    };

    return {
      MAINTENANCE: normalize('MAINTENANCE'),
      QUALITY: normalize('QUALITY'),
      POPULARITY: normalize('POPULARITY'),
    };
  }

  private calculateTotalScore(pillarScores: PillarScores): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const pillar of this.config.pillars) {
      const score = pillarScores[pillar.name as keyof PillarScores];
      weightedSum += score * pillar.weight;
      totalWeight += pillar.weight;
    }

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  private getSignalWeights(): Record<string, Record<string, number>> {
    const signalWeights: Record<string, Record<string, number>> = {};

    for (const pillar of this.config.pillars) {
      signalWeights[pillar.name] = Object.fromEntries(
        pillar.signals.map(signal => [signal.name, signal.weight]),
      );
    }

    return signalWeights;
  }
}