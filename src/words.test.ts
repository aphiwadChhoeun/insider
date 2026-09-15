import { describe, expect, test } from 'vitest';
import { WORDS } from './words';

describe('the secret word list', () => {
  test('holds no duplicates, so no word is likelier than another', () => {
    const seen = new Set(WORDS);
    expect(seen.size).toBe(WORDS.length);
  });

  test('is big enough that a group rarely sees a repeat', () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(270);
  });

  test('is sorted, so adding a word has an obvious home', () => {
    expect([...WORDS]).toEqual([...WORDS].sort());
  });

  test('is lowercase and free of stray whitespace', () => {
    for (const word of WORDS) {
      expect(word).toBe(word.toLowerCase().trim());
      expect(word).not.toBe('');
      expect(word).not.toMatch(/\s{2,}/);
    }
  });
});
