import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { ConstructAnalyzer } from '../library/analyzer';

function convertToStars(rating: number): string {
  const fullStars = chalk.yellow('★'.repeat(rating));
  const emptyStars = chalk.gray('☆'.repeat(5 - rating));
  return fullStars + emptyStars;
}

/**
 * Converts signal names to Display Name format
 * Examples:
 * - "weeklyDownloads" -> "Weekly Downloads"
 * - "numberOfContributors_Maintenance" -> "Number Of Contributors - Maintenance"
 */
function convertToDisplayName(signalName: string): string {
  return signalName
    .replace(/_/g, ' - ') // Convert underscore to dash with spaces
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters everywhere
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .replace(/\s+/g, ' ') // Clean up multiple spaces
    .trim();
}

function displayDetailsSignalInfo(signalScores: Record<string, Record<string, number>>, weights: Record<string, Record<string, number>>): void {
  console.log(chalk.gray('\n---'));

  Object.entries(signalScores).forEach(([pillar, signals]) => {
    const pillarString = '\n=== ' + pillar + ' ===';
    console.log(chalk.bold.cyan(`${pillarString.padEnd(54)}`), chalk.bold('SCORE  WEIGHT'));

    Object.entries(signals as Record<string, number>).forEach(([signal, score]) => {
      const displayName = convertToDisplayName(signal);
      const dots = chalk.gray('.'.repeat(Math.max(1, 50 - displayName.length)));
      const stars = convertToStars(score);
      const signalWeight = weights[pillar][signal];

      console.log(`${chalk.dim('—')} ${displayName} ${dots} ${stars}    ${chalk.cyan(signalWeight)}`);
    });
  });
}

export function cli() {
  const analyzer = new ConstructAnalyzer();

  void yargs(hideBin(process.argv))
    .command(
      '$0 <package>',
      'Usage: cdk-construct-analyzer <package> [options]',
      (yargsBuilder) => {
        return yargsBuilder
          .positional('package', {
            describe: 'NPM package name to analyze (e.g., "@aws-cdk/core")',
            type: 'string',
            demandOption: true,
          })
          .option('details', {
            alias: 'v',
            type: 'boolean',
            default: false,
            describe: 'Show detailed signal information',
          });
      },
      async (argv) => {
        try {
          const result = await analyzer.analyzePackage(argv.package as string);
          const weights = result.signalWeights;

          console.log(chalk.bold('\nLIBRARY:'), chalk.blue(result.packageName));
          console.log(chalk.bold('VERSION:'), chalk.blue(result.version));

          // Color overall score based on value
          let scoreColor;
          if (result.totalScore >= 80) {
            scoreColor = chalk.green;
          } else if (result.totalScore >= 60) {
            scoreColor = chalk.yellow;
          } else {
            scoreColor = chalk.red;
          }
          console.log(chalk.bold('\nOVERALL SCORE:'), scoreColor(`${result.totalScore}/100`));

          console.log(chalk.gray('\n---'));
          console.log(chalk.bold('\nSUBSCORES'));

          Object.entries(result.pillarScores).forEach(([pillar, score]) => {
            // Color subscore based on value
            let pillarColor;
            if (score >= 80) {
              pillarColor = chalk.green;
            } else if (score >= 60) {
              pillarColor = chalk.yellow;
            } else {
              pillarColor = chalk.red;
            }
            console.log(`  ${chalk.cyan(pillar.padEnd(12))}: ${pillarColor(score.toString().padStart(12) + '/100')}`);
          });

          // Only show detailed signal information if details flag is set
          if (argv.details) {
            displayDetailsSignalInfo(result.signalScores, weights);
          }
        } catch (error) {
          console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
          process.exit(1);
        }
      },
    )
    .help()
    .argv;
}