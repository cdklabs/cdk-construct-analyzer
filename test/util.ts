/**
 * Pin the system time for all tests in the enclosing describe block
 */
export function pinSystemTime(date: Date): void {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(date);
  });

  afterAll(() => {
    jest.useRealTimers();
  });
}
