# CDK Construct Analyzer

![cdk-constructs: Experimental](https://img.shields.io/badge/cdk--constructs-experimental-important.svg?style=for-the-badge)

[![View on Construct Hub](https://constructs.dev/badge?package=@cdklabs/cdk-construct-analyzer)](https://constructs.dev/packages/@cdklabs/cdk-construct-analyzer)

> The APIs in this module are experimental and under active development.
> They are subject to non-backward compatible changes or removal in any future version. These are
> not subject to the [Semantic Versioning](https://semver.org/) model and breaking changes will be
> announced in the release notes. This means that while you may use them, you may need to update
> your source code when upgrading to a newer version of this package.

## Overview

`@cdklabs/cdk-construct-analyzer` is a CLI and library for evaluating the quality of construct libraries.

It calculates a single score (0–100) based on three equally weighted aspects:

* **Maintenance**: Is the project actively maintained and are owners/maintainers responsive?
* **Quality**: Does the project have good docs, tests, linting, and hygiene?
* **Popularity**: How widely is the library adopted in the community?

Each package is scored on their latest version. Scores are unlikely to change drasically between versions.

> [!WARNING]  
> **Important Usage Guidelines**: This tool provides automated scoring based on publicly available metrics and can be used as **one factor** in your evaluation process, not as the sole decision making criteria. Scores reflect measurable signals but cannot capture all aspects of library quality, such as code architecture, security practices, or alignment with your specific use case. Always combine these scores with your own technical evaluation, security review, and testing before making adoption decisions.

## CLI Usage

```
> cdk-construct-analyzer --help

Usage: cdk-construct-analyzer <package> [options]

Arguments:
  package   Name of the construct package to score (Scored on the latest version)

Options:
 --details  Show detailed breakdown of signals
 --help     Show this help message
```

You can run it locally on any library published to npm by providing its package name:

```
> cdk-construct-analyzer cdk-ecr-deployment

LIBRARY: cdk-ecr-deployment
VERSION: 4.0.3

OVERALL SCORE: 80/100

---

SUBSCORES
  MAINTENANCE :           75/100
  QUALITY     :           83/100
  POPULARITY  :           85/100
```

## Details

Add `--details` for a detailed breakdown:

```
> cdk-construct-analyzer cdk-ecr-deployment --details

LIBRARY: cdk-ecr-deployment
VERSION: 4.0.3

OVERALL SCORE: 80/100

---

SUBSCORES
  MAINTENANCE :           75/100
  QUALITY     :           83/100
  POPULARITY  :           85/100

---

=== MAINTENANCE ===                                   SCORE  WEIGHT
— Time To First Response ............................ ★★☆☆☆    10
— Provenance Verification ........................... ★★★★★    10
— Release Frequency ................................. ★★★★☆    10
— Number Of Contributors - Maintenance .............. ★★★★☆    5
— Number Of Feats And Fixes ......................... ★★★★★    5
— Open Issues Ratio ................................. ★★★★★    5

=== QUALITY ===                                       SCORE  WEIGHT
— Documentation Completeness ........................ ★★★★☆    5
— Tests Checklist ................................... ★★★☆☆    5
— Author Package Count .............................. ★★★★★    5
— Release Notes Include Feats And Fixes ............. ★★★★★    5
— Stable Versioning ................................. ★★★★☆    5
— Multi Language Support ............................ ★★★★★    5

=== POPULARITY ===                                    SCORE  WEIGHT
— Weekly Downloads .................................. ★★★★★    10
— Github Stars ...................................... ★★★★☆    10
— Number Of Contributors - Popularity ............... ★★★★☆    5
```

## Programmatic Access

You can also use the analyzer programmatically in your TypeScript/JavaScript applications by importing the `ConstructAnalyzer` class:

```typescript
import { ConstructAnalyzer } from '@cdklabs/cdk-construct-analyzer';

const analyzer = new ConstructAnalyzer();

// Analyze a package and get detailed results
const result = await analyzer.analyzePackage('cdk-ecr-deployment');

console.log(`Package: ${result.packageName}`);
console.log(`Version: ${result.version}`);
console.log(`Overall Score: ${result.totalScore}/100`);

// Access pillar scores
console.log('Pillar Scores:');
Object.entries(result.pillarScores).forEach(([pillar, score]) => {
  console.log(`  ${pillar}: ${score}/100`);
});

// Access individual signal scores (star ratings 1-5)
console.log('Signal Scores:');
Object.entries(result.signalScores).forEach(([pillar, signals]) => {
  console.log(`  ${pillar}:`);
  Object.entries(signals).forEach(([signal, stars]) => {
    console.log(`    ${signal}: ${'★'.repeat(stars)}${'☆'.repeat(5-stars)}`);
  });
});
```

### ScoreResult Interface

The `analyzePackage` method returns a `ScoreResult` object with the following structure:

```typescript
interface ScoreResult {
  readonly packageName: string;     // "cdk-ecr-deployment"
  readonly version: string;         // "0.0.421"
  readonly totalScore: number;      // 76 (0-100)
  readonly pillarScores: Record<string, number>;        // { "MAINTENANCE": 66, "QUALITY": 75, "POPULARITY": 88 }
  readonly signalScores: Record<string, Record<string, number>>;  // { "MAINTENANCE": { "timeToFirstResponse": 2, "provenanceVerification": 5 } }
}
```

The `signalScores` contain star ratings (1-5) for each individual signal, while `pillarScores` and `totalScore` are normalized to a 0-100 scale.

## Scoring Pillars and Signals

The scoring algorithm evaluates each construct on three pillars with multiple weighted signals as support:

### Maintenance

Helps determine if the project is active and healthy, or abandoned. Signals include:

* Time to first response: Fast issue resolution reflects active, responsive maintainers.
* Provenance Verification: Verifies package authenticity and supply chain security.
* Open issues / total issues: A lower ratio of open issues indicates backlog health and follow through normalized by repository popularity. Note: 0 total issues scores worst (100% ratio) as it suggests no community engagement.
* Release Frequency: Regular releases signal iteration, patching, and progress.
* Number of Contributors: More contributors reduce risk of abandonment and reflect shared maintenance.
* Number of Features and Fixes: Counts occurrences of "feat" and "fix" in release notes from the past year, indicating active development.

### Quality

Signals that are visible in the repo/package that showcases quality:

* Documentation Completeness: High quality document
* Tests checklist (unit/snapshot): Tests ensure correctness and prevent regressions.
* Author Track Record: Measures how many packages the author has published, more published packages often indicate greater experience.
* Changelog includes feats/fixes: Checks if there are feats/fixes published in the release notes.
* Stable versioning (>=1.x.x, not deprecated): Indicates API maturity and stability.ation makes the project easier to adopt and use (README, API References, Usage Examples).
* Multi-language Support: Supporting more CDK languages shows extra effort and intent to reach a broader developer base

### Popularity

Signals that reflect adoption and community size:

* Contributors: More contributors typically indicate shared maintenance and community trust.
* Weekly Downloads: High or rising download counts suggest the library is being actively used.
* Repo stars: Stars represent general developer interest and visibility on GitHub.

## Scoring Weights

Not every signal has the same impact on library , so each signal is assigned an importance level. A signal with
importance level 3 will carry 3× the weight of a signal with importance level 1:

* **3 — Critical** signals that strongly influence a library’s overall health and usability (3 points)
* **2 — Valuable** indicators that support confidence but aren’t decisive signals (2 points)
* **1 — Supportive** or “nice to have” checks (1 points)

When calculating a subscore (Maintenance, Quality, Popularity), each signal’s grade is weighted by its importance.
Once all signals in a category are evaluated, the score is normalized to a 0–100 scale. This ensures that categories
with more signals don’t automatically outweigh others.
Finally, the three pillar scores are combined into the overall score using equal weights:

* **Maintenance**
* **Quality**
* **Popularity**
