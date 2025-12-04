# Contributing to CDK Construct Analyzer

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   yarn install
   ```
3. Build/test the project:
   ```bash
   yarn build
   ```

## Project Structure

```
src/
├── library/
│   ├── analyzer.ts          # Main analyzer logic
│   ├── config.ts            # Signal definitions and weights
│   ├── scoring.ts           # Scoring algorithms
│   └── data/                # Data collection modules
├── cli/
│   └── cli.ts               # CLI interface
└── regression-lib/
    ├── regression-tool.ts   # Weight optimization tool
    └── example-targets.json # Example target scores
```

## Adding New Signals

Signals are measurable indicators of library quality. To add a new signal:

### 1. Define the Signal in `config.ts`

Add your signal to the appropriate pillar (MAINTENANCE, QUALITY, or POPULARITY):

```typescript
{
    name: 'myNewSignal',
    defaultWeight: 10,
    description: 'Signal description',
    benchmarks: (unit: type) => scoringFunction(wayToScore, unit),
},
```

### 2. Implement Data Collection

Add a data collector in `src/library/data/`:

```typescript
export async function collectMyNewSignal(packageName: string): Promise<Type> {
  // Fetch and calculate your metric
  // Return value(s)
}
```

### 3. Add Tests

Create tests in `test/lib/data/`:

```typescript
describe('collectMyNewSignal', () => {
  test('should return valid value', async () => {
    const result = await collectMyNewSignal('test-package');
    expect(result).toBeGreaterThanOrEqual(0);
  });
});
```

## Calibrating Signal Weights

The regression tool helps optimize signal weights based on target scores for known packages.

### When to Recalibrate

- After adding new signals
- When scoring doesn't match expert judgment
- After significant changes to data collection
- Periodically to reflect ecosystem changes

### Using the Regression Tool

#### 1. Create Target Scores

Create a JSON file with packages and their desired scores (0-100):

```json
{
  "aws-cdk-lib": 95,
  "popular-construct": 85,
  "good-construct": 75,
  "average-construct": 60,
  "poor-construct": 40,
  "abandoned-construct": 20
}
```

**Tips for choosing targets:**
- Include 10-20 diverse packages
- Include packages you know well
- Mix popular and niche libraries
- Include both active and stale projects

#### 2. Run the Regression Tool

```bash
./bin/regression-cli path/to/targets.json
```

The tool will:
1. Analyze each package to collect signal data
2. Perform non-negative least squares regression
3. Generate optimal weights that sum to 100
4. Validate predictions vs. targets
5. Save results to `optimal-weights.json`

#### 3. Review the Output

```
Optimal Signal Weights (sum = 100):
====================================
  weeklyDownloads                        15%
  githubStars                            12%
  releaseFrequency                       10%
  ...

Validation Results:
===================
aws-cdk-lib           Target:  95 Predicted:  93 Error: 2.0
popular-construct     Target:  85 Predicted:  87 Error: 2.0
...

Mean Absolute Delta: 3.45
```

**What to look for:**
- Mean Absolute Delta < 4 is excellent
- Mean Absolute Delta < 8 is acceptable
- Individual errors > 12 suggest outliers or missing signals
- Weights of 0 suggest redundant or uncorrelated signals

#### 4. Apply the Weights

If satisfied with the results, update `config.ts`:

```typescript
// Before running regression, note which signals had which weights
// Then update the weight values in config.ts to match the percentages
// from optimal-weights.json

{
  name: 'weeklyDownloads',
  defaultWeight: 15,  // Updated from regression output
  // ...
}
```

#### 5. Validate Changes

Run the analyzer on test packages to verify the new weights:

```bash
cdk-construct-analyzer aws-cdk-lib --details
cdk-construct-analyzer some-other-package --details
```

### Iterative Refinement

1. Start with initial weights based on intuition
2. Run regression with diverse target scores
3. Review validation errors
4. Adjust targets for outliers or add more packages
5. Re-run regression
6. Apply weights and test
7. Repeat until satisfied