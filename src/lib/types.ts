/**
 * Configuration type definitions for the CDK Construct Analyzer
 */

/**
 * Benchmark configuration for converting raw values to star ratings (1-5)
 */
export interface BenchmarkConfig {
  readonly fiveStars: number;
  readonly fourStars: number;
  readonly threeStars: number;
  readonly twoStars: number;
}

/**
 * Properties of a signal configuration
 */
export interface SignalConfig {
  readonly pillar: string;
  readonly weight: number;
  readonly description: string;
  readonly benchmarks: BenchmarkConfig;
}

/**
 * Complete configuration interface
 */
export interface Config {
  readonly signals: Record<string, SignalConfig>;
}