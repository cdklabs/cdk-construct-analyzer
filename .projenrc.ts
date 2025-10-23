import { CdklabsTypeScriptProject } from 'cdklabs-projen-project-types';
import { NpmAccess } from 'projen/lib/javascript';

const project = new CdklabsTypeScriptProject({
  defaultReleaseBranch: 'main',
  devDeps: ['cdklabs-projen-project-types', '@types/jest'],
  name: 'cdk-construct-analyzer',
  projenrcTs: true,
  release: false,
  jest: true,
  deps: ['yargs', 'dotenv'], /* Runtime dependencies of this module. */
  bin: {
    'cdk-construct-analyzer': './bin/cdk-construct-analyzer',
  },
  npmAccess: NpmAccess.PUBLIC,
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();