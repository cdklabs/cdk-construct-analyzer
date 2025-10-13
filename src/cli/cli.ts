import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { ConstructAnalyzer } from '../lib/analyzer';

export function cli() {
  const analyzer = new ConstructAnalyzer();

  void yargs(hideBin(process.argv))
    .command(
      '$0 <package>',
      'Analyze a CDK construct package',
      (yargsBuilder) => {
        return yargsBuilder.positional('package', {
          describe: 'NPM package name to analyze (e.g., "yargs", "@aws-cdk/core")',
          type: 'string',
          demandOption: true,
        });
      },
      async (argv) => {
        try {
          const result = await analyzer.analyzePackage(argv.package as string);

          console.log(`LIBRARY: ${result.packageName}`);
          console.log(`VERSION: ${result.version}`);

          console.log(`\nOVERALL SCORE: ${result.totalScore.toFixed(1)}/100`);

          console.log('\n---');
          console.log('\nSUBSCORES');
          Object.entries(result.pillarScores).forEach(([pillar, score]) => {
            console.log(`  ${pillar}: ${(score as number).toFixed(1)}`);
          });

          console.log('\n---');
          Object.entries(result.signalScores).forEach(([pillar, signals]) => {
            console.log(`\n=== ${pillar} ===`);
            Object.entries(signals as Record<string, number>).forEach(([signal, score]) => {
              console.log(`  ${signal}: ${score.toFixed(1)}`);
            });
          });
          // TODO: ADD AND IMPLEMENT DISPLAY NAMES FOR EACH SIGNAL
          // TODO: FIX UP OUTPUT FORMATTING/MAYBE SEPARATE INPUT AND OUTPUT

        } catch (error) {
          console.error('Error:', error instanceof Error ? error.message : error);
          process.exit(1);
        }
      },
    )
    .help()
    .argv;
}