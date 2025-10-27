import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { ConstructAnalyzer } from '../lib/analyzer';
import { CONFIG } from '../lib/config';

function convertToStars(rating: number): string {
  const fullStars = '★'.repeat(rating);
  const emptyStars = '☆'.repeat(5 - rating);
  return fullStars + emptyStars;
}

/**
 * Converts signal names to Display Name format
 * Examples:
 * - "weeklyDownloads" -> "Weekly Downloads"
 * - "numberOfContributors(Maintenance)" -> "Number Of Contributors (Maintenance)"
 */
function convertToDisplayName(signalName: string): string {
  return signalName
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters everywhere
    .replace(/\s*\(/g, ' (') // Add single space before opening parenthesis
    .replace(/\( /g, '(') // Remove whitespace after opening parenthesis
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .replace(/\s+/g, ' ') // Clean up multiple spaces
    .trim();
}

export function cli() {
  const analyzer = new ConstructAnalyzer();

  void yargs(hideBin(process.argv))
    .command(
      '$0 <package>',
      'Analyze a CDK construct package',
      (yargsBuilder) => {
        return yargsBuilder
          .positional('package', {
            describe: 'NPM package name to analyze (e.g., "@aws-cdk/core")',
            type: 'string',
            demandOption: true,
          })
          .option('verbose', {
            alias: 'v',
            type: 'boolean',
            default: false,
            describe: 'Show detailed signal information',
          });
      },
      async (argv) => {
        try {
          const result = await analyzer.analyzePackage(argv.package as string);

          console.log(`\nLIBRARY: ${result.packageName}`);
          console.log(`VERSION: ${result.version}`);

          console.log(`\nOVERALL SCORE: ${result.totalScore}/100`);

          console.log('\n---');
          console.log('\nSUBSCORES');

          const pillarOrder = ['MAINTENANCE', 'QUALITY', 'POPULARITY'];
          pillarOrder.forEach(pillarName => {
            if (result.pillarScores[pillarName] !== undefined) {
              const score = result.pillarScores[pillarName];
              console.log(`  ${pillarName.padEnd(12)}: ${score.toString().padStart(12)}/100`);
            }
          });

          // Only show detailed signal information if verbose flag is set
          if (argv.verbose) {
            console.log('\n---');

            pillarOrder.forEach(pillarName => {
              const pillarString = '\n=== ' + pillarName + ' ===';
              console.log(`${pillarString.padEnd(54)} SCORE  WEIGHT`);

              const pillarConfig = CONFIG.pillars.find(p => p.name === pillarName);

              // need this because the find function can return undefined (pillar will always be defined)
              if (pillarConfig) {
                pillarConfig.signals.forEach(signalConfig => {
                  const signalScore = result.signalScores[pillarName][signalConfig.name];
                  const displayName = convertToDisplayName(signalConfig.name);
                  const stars = convertToStars(signalScore);
                  const dots = '.'.repeat(Math.max(1, 50 - displayName.length));

                  console.log(`— ${displayName} ${dots} ${stars}    ${signalConfig.weight}`);
                });
              }
            });
          }
        } catch (error) {
          console.error('Error:', error instanceof Error ? error.message : error);
          process.exit(1);
        }
      },
    )
    .help()
    .argv;
}