import { describe, expect, test } from 'vitest';
import { MAX_PLAYERS, initialState, reducer } from './game';
import type { State } from './game';
import { parseState } from './storage';

/** A round in progress: 3 players, one card face up, on the clock. */
function inProgress(): State {
  const started = reducer({ ...initialState, playerCount: 3 }, { type: 'startGame' });
  return reducer(started, { type: 'showRole' });
}

/** Round-trip through JSON the way localStorage would. */
function roundTrip(state: unknown): State | null {
  return parseState(JSON.parse(JSON.stringify(state)));
}

describe('parseState: sanitizing a good save', () => {
  test('restores a setup screen unchanged', () => {
    expect(roundTrip(initialState)).toEqual(initialState);
  });

  test('restores a round in progress', () => {
    const saved = inProgress();
    const loaded = roundTrip(saved);
    expect(loaded?.round?.word).toBe(saved.round?.word);
    expect(loaded?.round?.players).toEqual(saved.round?.players);
    expect(loaded?.round?.limit).toEqual(saved.round?.limit);
  });

  test('always comes back with the card face down', () => {
    const saved = inProgress();
    expect(saved.round?.revealed).toBe(true);
    expect(roundTrip(saved)?.round?.revealed).toBe(false);
  });

  test('keeps a running clock, so the deadline survives a reload', () => {
    const saved = inProgress();
    saved.round!.clock = { state: 'running', endsAt: 1_700_000_300_000 };
    expect(roundTrip(saved)?.round?.clock).toEqual({
      state: 'running',
      endsAt: 1_700_000_300_000,
    });
  });

  test('keeps a paused clock', () => {
    const saved = inProgress();
    saved.round!.clock = { state: 'paused', msLeft: 12_000 };
    expect(roundTrip(saved)?.round?.clock).toEqual({ state: 'paused', msLeft: 12_000 });
  });
});

describe('parseState: repairing a damaged save', () => {
  test('clamps out-of-range setup numbers', () => {
    const loaded = roundTrip({ ...initialState, playerCount: 99, minutes: 0, questions: 900 });
    expect(loaded?.playerCount).toBe(MAX_PLAYERS);
    expect(loaded?.minutes).toBe(1);
    expect(loaded?.questions).toBe(50);
  });

  test('pads a short names array back to full length', () => {
    const loaded = roundTrip({ ...initialState, names: ['Mina'] });
    expect(loaded?.names).toHaveLength(MAX_PLAYERS);
    expect(loaded?.names[0]).toBe('Mina');
    expect(loaded?.names[1]).toBe('');
  });

  test('truncates an over-long names array', () => {
    const loaded = roundTrip({ ...initialState, names: Array(50).fill('x') });
    expect(loaded?.names).toHaveLength(MAX_PLAYERS);
  });

  test('clamps a reveal turn back onto a real player', () => {
    const saved = inProgress();
    saved.round!.turn = 77;
    expect(saved.screen).toBe('reveal');
    expect(roundTrip(saved)?.round?.turn).toBe(2);
  });

  test('leaves the play screen past the last player, where that is normal', () => {
    const saved = inProgress();
    saved.screen = 'play';
    saved.round!.turn = 3;
    expect(roundTrip(saved)?.round?.turn).toBe(3);
  });

  test('clamps a negative turn', () => {
    const saved = inProgress();
    saved.round!.turn = -4;
    expect(roundTrip(saved)?.round?.turn).toBe(0);
  });

  test('clamps a negative question tally', () => {
    const saved = inProgress();
    saved.round!.asked = -5;
    expect(roundTrip(saved)?.round?.asked).toBe(0);
  });

  test('falls back to setup when the screen needs a round that is missing', () => {
    const loaded = roundTrip({ ...initialState, screen: 'play', round: null });
    expect(loaded?.screen).toBe('setup');
    expect(loaded?.returnScreen).toBe('setup');
  });

  test('repairs an unknown returnScreen', () => {
    const loaded = roundTrip({ ...initialState, screen: 'setup', returnScreen: 'elsewhere' });
    expect(loaded?.returnScreen).toBe('setup');
  });
});

describe('parseState: rejecting junk', () => {
  const junk: [string, unknown][] = [
    ['null', null],
    ['a string', 'hello'],
    ['a number', 7],
    ['an array', [1, 2, 3]],
    ['an empty object', {}],
    ['an unknown screen', { ...initialState, screen: 'casino' }],
    ['an unknown mode', { ...initialState, mode: 'vibes' }],
    ['a non-numeric player count', { ...initialState, playerCount: 'four' }],
    ['names that are not strings', { ...initialState, names: [1, 2, 3] }],
  ];

  test.each(junk)('rejects %s', (_label, value) => {
    expect(parseState(value)).toBeNull();
  });

  test('rejects a round missing its players', () => {
    const saved = inProgress() as unknown as { round: Record<string, unknown> };
    delete saved.round.players;
    expect(parseState(saved)).toBeNull();
  });

  test('rejects a round with too few players to deal roles', () => {
    const saved = inProgress();
    saved.round!.players = saved.round!.players.slice(0, 1);
    expect(parseState(saved)).toBeNull();
  });

  test('rejects an unknown role', () => {
    const saved = inProgress();
    saved.round!.players[0] = { name: 'Mina', role: 'wizard' as never };
    expect(parseState(saved)).toBeNull();
  });

  test('rejects a malformed limit', () => {
    const saved = inProgress();
    saved.round!.limit = { mode: 'time' } as never;
    expect(parseState(saved)).toBeNull();
  });

  test('rejects a malformed clock', () => {
    const saved = inProgress();
    saved.round!.clock = { state: 'running' } as never;
    expect(parseState(saved)).toBeNull();
  });
});
