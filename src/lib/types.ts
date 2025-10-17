/**
 * Configuration type definitions for the CDK Construct Analyzer
 */

/**
 * Benchmark function type for converting raw values to quality levels (1-5)
 */
export type BenchmarkFunction = (value: number) => number;

/**
 * Properties of a signal configuration
 */
export interface SignalConfig {
  readonly name: string;
  readonly weight: number;
  readonly description: string;
  readonly benchmarks: BenchmarkFunction;
}

/**
 * Pillar configuration
 */
export interface PillarConfig {
  readonly name: string;
  readonly description: string;
  readonly signals: SignalConfig[];
}

/**
 * Complete configuration interface
 */
export interface Config {
  readonly pillars: PillarConfig[];
}

/**
 * Checklist item configuration for scoring
 */
export interface ChecklistItem {
  readonly present: boolean;
  readonly value: number;
}

/**
 * Generic checklist interface for scoring
 */
export interface Checklist {
  readonly [key: string]: ChecklistItem;
}