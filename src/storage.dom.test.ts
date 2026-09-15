// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { initialState, reducer } from './game';
import { STORAGE_KEY, clear, load, save } from './storage';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('load and save', () => {
  test('a saved game comes back on load', () => {
    const state = reducer({ ...initialState, playerCount: 3 }, { type: 'startGame' });
    save(state);
    expect(load()?.round?.word).toBe(state.round?.word);
  });

  test('load is null when nothing was ever saved', () => {
    expect(load()).toBeNull();
  });

  test('load is null when the save is not even JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(load()).toBeNull();
  });

  test('clear removes the save', () => {
    save(initialState);
    clear();
    expect(load()).toBeNull();
  });

  test('save survives a storage that refuses to write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => save(initialState)).not.toThrow();
  });

  test('load survives a storage that refuses to read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(load()).toBeNull();
  });
});
