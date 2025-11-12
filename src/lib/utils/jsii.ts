/**
 * Analyzes jsii configuration to determine multi-language support
 */

/**
 * Extracts the count of supported languages from jsii configuration in package.json
 */
export function analyzeJsiiLanguageSupport(packageJson: any): number {
  // Check if jsii is configured
  if (!packageJson?.jsii?.targets) {
    return 0;
  }

  return Object.keys(packageJson.jsii.targets).length;
}
