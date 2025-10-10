import { cli } from '../src';

// test doesn't do much for now, will add tests in a later PR
// focusing on initial project code
describe('CLI', () => {
  it('should export cli function', () => {
    expect(typeof cli).toBe('function');
  });
});