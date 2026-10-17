import { shutdownWithinDeadline } from './shutdown';

describe('bounded shutdown', () => {
  it('closes successfully when the telemetry destination refuses the flush', async () => {
    expect(
      await shutdownWithinDeadline(
        () => Promise.resolve(),
        () => Promise.reject(new Error('EXPORT_FAILED')),
        100,
      ),
    ).toBe(true);
  });
  it('keeps telemetry-only timeout from failing an already closed application', async () => {
    expect(
      await shutdownWithinDeadline(
        () => Promise.resolve(),
        () => new Promise(() => {}),
        20,
      ),
    ).toBe(true);
  });
  it('returns within the deadline when application close never settles', async () => {
    const start = Date.now();
    expect(
      await shutdownWithinDeadline(
        () => new Promise(() => {}),
        () => Promise.resolve(),
        20,
      ),
    ).toBe(false);
    expect(Date.now() - start).toBeLessThan(500);
  });
  it('flushes telemetry after application closure even when closure fails', async () => {
    const events: string[] = [];
    expect(
      await shutdownWithinDeadline(
        () => {
          events.push('close');
          return Promise.reject(new Error('CANARY'));
        },
        () => {
          events.push('flush');
          return Promise.resolve();
        },
        100,
      ),
    ).toBe(false);
    expect(events).toEqual(['close', 'flush']);
  });
});
