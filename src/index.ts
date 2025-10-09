import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export function cli() {
  void yargs(hideBin(process.argv))
    .command(
      '$0',
      'CDK Construct Analyzer CLI',
      {},
      () => {
        console.log('Hello World!');
      },
    )
    .help()
    .argv;
}