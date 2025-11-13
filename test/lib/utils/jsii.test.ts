import { analyzeJsiiLanguageSupport } from '../../../src/lib/utils/jsii';

describe('analyzeJsiiLanguageSupport', () => {
  test('should return 0 when jsii is not configured', () => {
    const packageJson = {
      name: 'test-package',
      version: '1.0.0',
    };

    const result = analyzeJsiiLanguageSupport(packageJson);

    expect(result).toBe(0);
  });

  test('should return count of supported languages', () => {
    const packageJson = {
      name: 'test-package',
      version: '1.0.0',
      jsii: {
        targets: {
          python: {},
          java: {},
          dotnet: {},
          go: {},
        },
      },
    };

    const result = analyzeJsiiLanguageSupport(packageJson);

    expect(result).toBe(4);
  });

  test('should return 0 when jsii.targets does not exist', () => {
    const packageJson = {
      name: 'test-package',
      version: '1.0.0',
      jsii: {
      },
    };

    const result = analyzeJsiiLanguageSupport(packageJson);

    expect(result).toBe(0);
  });

  test('should return 0 when jsii.targets is empty', () => {
    const packageJson = {
      name: 'test-package',
      version: '1.0.0',
      jsii: {
        targets: {},
      },
    };

    const result = analyzeJsiiLanguageSupport(packageJson);

    expect(result).toBe(0);
  });
});
