import { CdklabsTypeScriptProject } from "cdklabs-projen-project-types";
const project = new CdklabsTypeScriptProject({
  defaultReleaseBranch: "main",
  devDeps: ["cdklabs-projen-project-types"],
  name: "@cdklabs/cdk-construct-analyzer",
  projenrcTs: true,
  release: false,

  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();