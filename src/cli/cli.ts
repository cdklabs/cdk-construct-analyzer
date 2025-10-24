import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { ConstructAnalyzer } from '../lib/analyzer';

/**
 * Converts snake_case signal names to Display Name format
 * Example: "weeklyDownloads" -> "Weekly Downloads"
 */
function convertToDisplayName(signalName: string): string {
  return signalName
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .trim();
}

export function cli() {
  const analyzer = new ConstructAnalyzer();

  void yargs(hideBin(process.argv))
    .command(
      '$0 <package>',
      'Analyze a CDK construct package',
      (yargsBuilder) => {
        return yargsBuilder.positional('package', {
          describe: 'NPM package name to analyze (e.g., "@aws-cdk/core")',
          type: 'string',
          demandOption: true,
        });
      },
      async (argv) => {
        try {
          const result = await analyzer.analyzePackage(argv.package as string);

          console.log(`LIBRARY: ${result.packageName}`);
          console.log(`VERSION: ${result.version}`);

          console.log(`\nOVERALL SCORE: ${Math.round(result.totalScore)}/100`);

          console.log('\n---');
          console.log('\nSUBSCORES');
          Object.entries(result.pillarScores).forEach(([pillar, score]) => {
            console.log(`  ${pillar}: ${Math.round(score as number)}`);
          });

          console.log('\n---');
          Object.entries(result.signalScores).forEach(([pillar, signals]) => {
            console.log(`\n=== ${pillar} ===`);
            Object.entries(signals as Record<string, number>).forEach(([signal, score]) => {
              const display_name = convertToDisplayName(signal);
              console.log(`  ${display_name}: ${score}`);
            });
          });

        } catch (error) {
          console.error('Error:', error instanceof Error ? error.message : error);
          process.exit(1);
        }
      },
    )
    .help()
    .argv;
}