#!/usr/bin/env node

import * as fs from 'fs';
import chalk from 'chalk';
import { ConstructAnalyzer } from '../library/analyzer';
import { CONFIG } from '../library/config';
import type { SignalWeights } from '../library/types';

/**
 * Input format: map of package names to target scores
 */
interface TargetScores {
  [packageName: string]: number;
}

/**
 * Output format: map of signal names to optimal weights
 */
type OptimalWeights = SignalWeights;

/**
 * Training data point for regression
 */
interface TrainingPoint {
  packageName: string;
  targetScore: number;
  signalValues: Record<string, number>;
}

/**
 * CLI tool for generating optimal signal weights using regression
 */
class RegressionCLI {
  private analyzer: ConstructAnalyzer;
  private allSignalNames: string[];

  constructor() {
    this.analyzer = new ConstructAnalyzer();
    this.allSignalNames = this.extractAllSignalNames();
  }

  /**
   * Extract all signal names from the current config
   */
  private extractAllSignalNames(): string[] {
    const signalNames: string[] = [];
    for (const pillar of CONFIG.pillars) {
      for (const signal of pillar.signals) {
        signalNames.push(signal.name);
      }
    }
    return signalNames;
  }

  /**
   * Main entry point for the CLI
   */
  async run(inputFile?: string): Promise<void> {
    try {
      console.log(chalk.bold.cyan('Experimental Signal Weight Regression Tool'));
      console.log(chalk.cyan('============================================\n'));

      // Load target scores
      const targetScores = await this.loadTargetScores(inputFile);
      console.log(chalk.green(`Loaded ${Object.keys(targetScores).length} packages with target scores`));

      // Collect training data
      console.log(chalk.blue('Analyzing packages to collect signal data...'));
      const trainingData = await this.collectTrainingData(targetScores);

      // Perform regression
      console.log(chalk.blue('Performing regression to find optimal weights...'));
      const optimalWeights = this.performRegression(trainingData);

      // Output results
      await this.outputResults(optimalWeights, trainingData);

    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  /**
   * Load target scores from file or prompt user
   */
  private async loadTargetScores(inputFile?: string): Promise<TargetScores> {
    if (inputFile && fs.existsSync(inputFile)) {
      const content = fs.readFileSync(inputFile, 'utf-8');
      return JSON.parse(content);
    }

    // Default example if no file provided
    const defaultScores: TargetScores = {
      'aws-cdk': 85,
      'react': 95,
      'lodash': 75,
      'express': 90,
      'typescript': 88,
    };

    console.log(chalk.yellow(' No input file provided, using default example:'));
    console.log(chalk.gray(JSON.stringify(defaultScores, null, 2)));
    console.log(chalk.yellow('\n💡 To use your own data, create a JSON file with package names and target scores.\n'));

    return defaultScores;
  }

  /**
   * Collect training data by analyzing each package
   */
  private async collectTrainingData(targetScores: TargetScores): Promise<TrainingPoint[]> {
    const trainingData: TrainingPoint[] = [];

    for (const [packageName, targetScore] of Object.entries(targetScores)) {
      try {
        console.log(chalk.gray(`  Analyzing ${packageName}...`));
        const result = await this.analyzer.analyzePackage(packageName);

        // Extract signal values converted to points (0-100 scale)
        const signalValues: Record<string, number> = {};
        for (const signals of Object.values(result.signalScores)) {
          for (const [signalName, starRating] of Object.entries(signals)) {
            // Convert star rating (1-5) to points (0-100) using same logic as analyzer
            const points = (starRating - 1) * 25;
            signalValues[signalName] = points;
          }
        }

        trainingData.push({
          packageName,
          targetScore,
          signalValues,
        });

      } catch (error) {
        console.warn(chalk.yellow(`  Failed to analyze ${packageName}: ${error instanceof Error ? error.message : String(error)}`));
      }
    }

    console.log(chalk.green(`Successfully analyzed ${trainingData.length} packages\n`));
    return trainingData;
  }

  /**
   * Perform linear regression to find optimal weights
   * Using regularized least squares to handle singular matrices
   */
  private performRegression(trainingData: TrainingPoint[]): OptimalWeights {
    if (trainingData.length === 0) {
      throw new Error('No training data available for regression');
    }

    // Prepare matrices
    const X: number[][] = [];
    const y: number[] = [];

    for (const point of trainingData) {
      const row: number[] = [];
      for (const signalName of this.allSignalNames) {
        // Use signal value or 0 if not present (default points for rating 1)
        row.push(point.signalValues[signalName] || 0);
      }
      X.push(row);
      y.push(point.targetScore);
    }

    // Use non-negative least squares to ensure weights >= 0
    const weights = this.solveNonNegativeLeastSquares(X, y);

    // Convert to result format with whole numbers (minimum 0)
    const rawWeights: OptimalWeights = {};
    for (let i = 0; i < this.allSignalNames.length; i++) {
      rawWeights[this.allSignalNames[i]] = Math.max(0, weights[i]);
    }

    // Normalize weights to sum to 100
    const totalWeight = Object.values(rawWeights).reduce((sum: number, weight) => sum + weight, 0);
    const optimalWeights: OptimalWeights = {};

    if (totalWeight > 0) {
      for (const [signalName, weight] of Object.entries(rawWeights)) {
        optimalWeights[signalName] = Math.round((weight / totalWeight) * 100);
      }

      // Handle rounding errors - ensure sum is exactly 100
      const currentSum = Object.values(optimalWeights).reduce((sum: number, weight) => sum + weight, 0);
      if (currentSum !== 100) {
        // Find the signal with the highest weight and adjust it
        const maxSignal = Object.entries(optimalWeights).reduce((max, [name, weight]) =>
          weight > max.weight ? { name, weight } : max, { name: '', weight: 0 });
        optimalWeights[maxSignal.name] += (100 - currentSum);
      }
    } else {
      // If all weights are zero, distribute equally
      const equalWeight = Math.floor(100 / this.allSignalNames.length);
      const remainder = 100 - (equalWeight * this.allSignalNames.length);

      for (let i = 0; i < this.allSignalNames.length; i++) {
        optimalWeights[this.allSignalNames[i]] = equalWeight + (i < remainder ? 1 : 0);
      }
    }

    return optimalWeights;
  }

  /**
   * Solve non-negative least squares using iterative algorithm
   * Ensures all weights >= 0
   */
  private solveNonNegativeLeastSquares(X: number[][], y: number[]): number[] {
    const numFeatures = this.allSignalNames.length;
    const numSamples = X.length;

    // Start with ridge regression solution
    let weights = this.solveRidgeRegression(X, y);

    // Iteratively project negative weights to zero and re-solve
    const maxIterations = 50;
    let iteration = 0;

    while (iteration < maxIterations) {
      // Check if any weights are negative
      const hasNegative = weights.some(w => w < 0);
      if (!hasNegative) break;

      // Set negative weights to zero and create constrained problem
      const activeSet: boolean[] = weights.map(w => w >= 0);

      // Create reduced matrices with only non-negative variables
      const reducedX: number[][] = [];
      const activeIndices: number[] = [];

      for (let i = 0; i < numFeatures; i++) {
        if (activeSet[i]) {
          activeIndices.push(i);
        }
      }

      if (activeIndices.length === 0) {
        // All weights are negative, return zeros
        return new Array(numFeatures).fill(0);
      }

      // Build reduced X matrix
      for (let i = 0; i < numSamples; i++) {
        const row: number[] = [];
        for (const idx of activeIndices) {
          row.push(X[i][idx]);
        }
        reducedX.push(row);
      }

      // Solve reduced problem
      const reducedWeights = this.solveRidgeRegression(reducedX, y, 0.01);

      // Map back to full weight vector
      weights = new Array(numFeatures).fill(0);
      for (let i = 0; i < activeIndices.length; i++) {
        weights[activeIndices[i]] = Math.max(0, reducedWeights[i]);
      }

      iteration++;
    }

    // Final projection to ensure non-negativity
    return weights.map(w => Math.max(0, w));
  }

  /**
   * Solve ridge regression: weights = (X^T * X + λI)^-1 * X^T * y
   * This adds regularization to prevent singular matrices
   */
  private solveRidgeRegression(X: number[][], y: number[], lambda: number = 0.1): number[] {
    // X^T (transpose)
    const XT = this.transpose(X);

    // X^T * X
    const XTX = this.multiply(XT, X);

    // Add regularization: X^T * X + λI
    for (let i = 0; i < XTX.length; i++) {
      XTX[i][i] += lambda;
    }

    // X^T * y
    const XTy = this.multiplyVector(XT, y);

    // (X^T * X + λI)^-1 * X^T * y
    try {
      const XTXInv = this.invert(XTX);
      return this.multiplyVector(XTXInv, XTy);
    } catch (error) {
      // If still singular, use pseudoinverse approach
      console.warn(chalk.yellow('Using pseudoinverse fallback method'));
      return this.solvePseudoInverse(X, y);
    }
  }

  /**
   * Fallback method using simple pseudoinverse approximation
   */
  private solvePseudoInverse(X: number[][], y: number[]): number[] {
    // Simple approach: solve each signal weight independently
    const weights: number[] = [];

    for (let j = 0; j < this.allSignalNames.length; j++) {
      let numerator = 0;
      let denominator = 0;

      for (let i = 0; i < X.length; i++) {
        numerator += X[i][j] * y[i];
        denominator += X[i][j] * X[i][j];
      }

      weights[j] = denominator > 0 ? numerator / denominator : 0;
    }

    return weights;
  }

  /**
   * Matrix transpose
   */
  private transpose(matrix: number[][]): number[][] {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const result: number[][] = [];

    for (let j = 0; j < cols; j++) {
      result[j] = [];
      for (let i = 0; i < rows; i++) {
        result[j][i] = matrix[i][j];
      }
    }

    return result;
  }

  /**
   * Matrix multiplication
   */
  private multiply(A: number[][], B: number[][]): number[][] {
    const rowsA = A.length;
    const colsA = A[0].length;
    const colsB = B[0].length;
    const result: number[][] = [];

    for (let i = 0; i < rowsA; i++) {
      result[i] = [];
      for (let j = 0; j < colsB; j++) {
        let sum = 0;
        for (let k = 0; k < colsA; k++) {
          sum += A[i][k] * B[k][j];
        }
        result[i][j] = sum;
      }
    }

    return result;
  }

  /**
   * Matrix-vector multiplication
   */
  private multiplyVector(matrix: number[][], vector: number[]): number[] {
    const result: number[] = [];
    for (let i = 0; i < matrix.length; i++) {
      let sum = 0;
      for (let j = 0; j < vector.length; j++) {
        sum += matrix[i][j] * vector[j];
      }
      result.push(sum);
    }
    return result;
  }

  /**
   * Matrix inversion using Gauss-Jordan elimination
   */
  private invert(matrix: number[][]): number[][] {
    const n = matrix.length;
    const augmented: number[][] = [];

    // Create augmented matrix [A|I]
    for (let i = 0; i < n; i++) {
      augmented[i] = [...matrix[i]];
      for (let j = 0; j < n; j++) {
        augmented[i].push(i === j ? 1 : 0);
      }
    }

    // Gauss-Jordan elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }

      // Swap rows
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

      // Make diagonal element 1
      const pivot = augmented[i][i];
      if (Math.abs(pivot) < 1e-10) {
        throw new Error('Matrix is singular and cannot be inverted');
      }

      for (let j = 0; j < 2 * n; j++) {
        augmented[i][j] /= pivot;
      }

      // Eliminate column
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = augmented[k][i];
          for (let j = 0; j < 2 * n; j++) {
            augmented[k][j] -= factor * augmented[i][j];
          }
        }
      }
    }

    // Extract inverse matrix
    const inverse: number[][] = [];
    for (let i = 0; i < n; i++) {
      inverse[i] = augmented[i].slice(n);
    }

    return inverse;
  }

  /**
   * Output results and validation
   */
  private async outputResults(optimalWeights: OptimalWeights, trainingData: TrainingPoint[]): Promise<void> {
    console.log(chalk.bold.magenta('\nOptimal Signal Weights (sum = 100):'));
    console.log(chalk.magenta('===================================='));

    // Display weights with colors based on their values
    const sortedWeights = Object.entries(optimalWeights).sort(([,a], [,b]) => (b as number) - (a as number));
    for (const [signal, weight] of sortedWeights) {
      let colorFn = chalk.gray;
      if (weight >= 10) colorFn = chalk.green.bold;
      else if (weight >= 5) colorFn = chalk.green;
      else if (weight >= 2) colorFn = chalk.yellow;

      console.log(`  ${signal.padEnd(37)} ${colorFn(weight.toString().padStart(3))}%`);
    }

    // Verify and display the sum
    const weightSum = Object.values(optimalWeights).reduce((sum: number, weight) => sum + weight, 0);
    console.log(chalk.cyan(`\nTotal weight sum: ${weightSum} (each point = 1% contribution)`));

    // Calculate and show validation metrics using the analyzer's custom weights feature
    // This ensures we're using the exact same scoring logic as the main analyzer
    console.log(chalk.bold.blue('\nValidation Results (using analyzer with custom weights):'));
    console.log(chalk.blue('======================================================='));

    let totalError = 0;
    for (const point of trainingData) {
      try {
        // Use the analyzer with custom weights to get the actual predicted score
        const result = await this.analyzer.analyzePackage(point.packageName, optimalWeights);
        const predictedScore = result.totalScore;
        const error = Math.abs(predictedScore - point.targetScore);
        totalError += error;

        // Color code the error
        let errorColor = chalk.green;
        if (error > 10) errorColor = chalk.red;
        else if (error > 5) errorColor = chalk.yellow;

        console.log(`${chalk.white(point.packageName.padEnd(35))} Target: ${chalk.cyan(point.targetScore.toString().padStart(3))} Predicted: ${chalk.magenta(predictedScore.toString().padStart(3))} Error: ${errorColor(error.toFixed(1))}`);
      } catch (error) {
        console.warn(chalk.yellow(`  Failed to validate ${point.packageName}: ${error instanceof Error ? error.message : String(error)}`));
      }
    }

    const meanError = totalError / trainingData.length;
    let meanErrorColor = chalk.green;
    if (meanError > 10) meanErrorColor = chalk.red;
    else if (meanError > 5) meanErrorColor = chalk.yellow;

    console.log(chalk.bold(`\nMean Absolute Delta: ${meanErrorColor(meanError.toFixed(2))}`));

    // Save results to file
    const outputFile = 'optimal-weights.json';
    fs.writeFileSync(outputFile, JSON.stringify(optimalWeights, null, 2));
    console.log(chalk.green(`\nResults saved to ${outputFile}`));
  }
}

// Export for use in bin script

export { RegressionCLI };