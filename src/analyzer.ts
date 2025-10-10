import * as fs from 'fs';
import { collectPackageData } from './data';
import { signalCalculators } from './signals/index';

// What each signal looks like in the config
interface SignalConfig {
  pillar: string;
  weight: number;
  enabled: boolean;
  description: string;
}

// What each pillar looks like in the config
interface PillarConfig {
  name: string;
  weight: number;
  description: string;
}

// The overall structure of our config.json file
interface Config {
  signals: Record<string, SignalConfig>; // signal name -> signal config
  pillars: Record<string, PillarConfig>; // pillar name -> pillar config
}

// What our analyzer returns after analyzing a package
export interface ScoreResult {
  packageName: string; // "yargs"
  version: string;
  totalScore: number; // 85.5
  pillarScores: Record<string, number>; // { "popularity": 42.3 }
  signalScores: Record<string, Record<string, number>>; // { "popularity": { "weekly_downloads": 21.1, "github_stars": 21.2 } }
}

export class ConstructAnalyzer {
  private config: Config;

  constructor() {
    const configData = fs.readFileSync('src/config.json', 'utf8');
    this.config = JSON.parse(configData);
  }

  async analyzePackage(packageName: string): Promise<ScoreResult> {
    const packageData = await collectPackageData(packageName);

    const version: string = packageData.npm.version;
    const signalScores: Record<string, Record<string, number>> = {};
    const pillarScores: Record<string, number> = {};

    for (const [signalName, signalConfig] of Object.entries(this.config.signals)) {
      if (!signalConfig.enabled) continue;

      const calculator = signalCalculators[signalName as keyof typeof signalCalculators];
      if (!calculator) continue;

      // Get star rating (1-5) from signal calculators
      const starRating = await calculator(packageData);

      // Convert stars to points: 1★=0, 2★=25, 3★=50, 4★=75, 5★=100
      const points = (starRating - 1) * 25;

      // Organize signals by pillar (store the points for display)
      if (!signalScores[signalConfig.pillar]) {
        signalScores[signalConfig.pillar] = {};
      }
      signalScores[signalConfig.pillar][signalName] = starRating;

      // For pillar calculation, apply importance weight to the points
      const weightedScore = points * signalConfig.weight;

      if (!pillarScores[signalConfig.pillar]) {
        pillarScores[signalConfig.pillar] = 0;
      }
      pillarScores[signalConfig.pillar] += weightedScore;
    }

    // Normalize pillar scores to 0-100 and calculate total
    const normalizedPillarScores: Record<string, number> = {};

    for (const [pillar, weightedSum] of Object.entries(pillarScores)) {
      // Get total weight for this pillar to normalize
      const pillarSignals = Object.entries(this.config.signals).filter(([_, config]) =>
        config.pillar === pillar && config.enabled,
      );
      const totalWeight = pillarSignals.reduce((sum, [_, config]) => sum + config.weight, 0);

      // Normalize pillar score to 0-100 (weighted average)
      const normalizedPillarScore = totalWeight > 0 ? Math.min(100, weightedSum / totalWeight) : 0;
      normalizedPillarScores[pillar] = normalizedPillarScore;
    }

    // Calculate overall score as equal-weighted average of all pillars
    const pillarCount = Object.keys(normalizedPillarScores).length;

    let totalScore = 0;
    if (pillarCount > 0) {
      const pillarScoreSum = Object.values(normalizedPillarScores).reduce((sum, score) => sum + score, 0);
      totalScore = pillarScoreSum / pillarCount;
    }

    return {
      packageName,
      version,
      totalScore: totalScore,
      pillarScores: normalizedPillarScores,
      signalScores,
    };
  }


}