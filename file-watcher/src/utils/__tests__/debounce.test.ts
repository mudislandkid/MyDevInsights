/**
 * Debouncer Unit Tests
 */

import { Debouncer } from '../debounce';

describe('Debouncer', () => {
  jest.useFakeTimers();

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should debounce multiple rapid calls to the same key', () => {
    const callback = jest.fn();
    const debouncer = new Debouncer<string>(callback, 1000);

    // Rapid calls
    debouncer.debounce('key1', 'data1');
    debouncer.debounce('key1', 'data2');
    debouncer.debounce('key1', 'data3');

    // Should not call yet
    expect(callback).not.toHaveBeenCalled();

    // Fast forward time
    jest.advanceTimersByTime(1000);

    // Should call once with latest data
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'key1',
        data: 'data3',
        timestamp: expect.any(Number),
      })
    );
  });

  it('should handle different keys independently', () => {
    const callback = jest.fn();
    const debouncer = new Debouncer<string>(callback, 1000);

    debouncer.debounce('key1', 'data1');
    debouncer.debounce('key2', 'data2');

    jest.advanceTimersByTime(1000);

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'key1',
        data: 'data1',
      })
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'key2',
        data: 'data2',
      })
    );
  });

  it('should cancel all pending timers', () => {
    const callback = jest.fn();
    const debouncer = new Debouncer<string>(callback, 1000);

    debouncer.debounce('key1', 'data1');
    debouncer.debounce('key2', 'data2');

    debouncer.cancelAll();

    jest.advanceTimersByTime(1000);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should flush all pending events immediately', () => {
    const callback = jest.fn();
    const debouncer = new Debouncer<string>(callback, 1000);

    debouncer.debounce('key1', 'data1');
    debouncer.debounce('key2', 'data2');

    debouncer.flushAll();

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'key1',
        data: 'data1',
      })
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'key2',
        data: 'data2',
      })
    );
  });

  it('should reset timer on repeated debounce for same key', () => {
    const callback = jest.fn();
    const debouncer = new Debouncer<string>(callback, 1000);

    debouncer.debounce('key1', 'data1');

    // Advance 500ms
    jest.advanceTimersByTime(500);

    // Debounce again - should reset timer
    debouncer.debounce('key1', 'data2');

    // Advance another 500ms (1000ms total)
    jest.advanceTimersByTime(500);

    // Should not have called yet (only 500ms since last debounce)
    expect(callback).not.toHaveBeenCalled();

    // Advance final 500ms
    jest.advanceTimersByTime(500);

    // Now should call with latest data
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'key1',
        data: 'data2',
      })
    );
  });

  it('should handle complex data types', () => {
    const callback = jest.fn();
    const debouncer = new Debouncer<{ name: string; value: number }>(callback, 1000);

    debouncer.debounce('key1', { name: 'test', value: 42 });

    jest.advanceTimersByTime(1000);

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'key1',
        data: { name: 'test', value: 42 },
      })
    );
  });
});
