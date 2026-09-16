import { describe, expect, test } from 'vitest';
import {
  MAX_MINUTES,
  MAX_PLAYERS,
  MAX_QUESTIONS,
  MIN_MINUTES,
  MIN_PLAYERS,
  MIN_QUESTIONS,
  assignRoles,
  initialState,
  pickWord,
  questionsLeft,
  reducer,
  resolveNames,
  secondsLeftOf,
} from './game';
import type { State } from './game';
import { WORDS } from './words';

describe('resolveNames', () => {
  test('keeps trimmed names that were entered', () => {
    expect(resolveNames(['  Aphiwad ', 'Mina'])).toEqual(['Aphiwad', 'Mina']);
  });

  test('falls back to Player N for blank entries', () => {
    expect(resolveNames(['', '   ', 'Mina'])).toEqual(['Player 1', 'Player 2', 'Mina']);
  });
});

describe('assignRoles', () => {
  const names = ['A', 'B', 'C', 'D', 'E'];

  test('assigns exactly one master and one insider', () => {
    const players = assignRoles(names);
    expect(players.filter((p) => p.role === 'master')).toHaveLength(1);
    expect(players.filter((p) => p.role === 'insider')).toHaveLength(1);
  });

  test('assigns every remaining player the common role', () => {
    const players = assignRoles(names);
    expect(players.filter((p) => p.role === 'common')).toHaveLength(names.length - 2);
  });

  test('keeps players in the order they were given', () => {
    expect(assignRoles(names).map((p) => p.name)).toEqual(names);
  });

  test('gives every player a turn over many rounds', () => {
    const mastered = new Set<string>();
    const insidered = new Set<string>();
    for (let i = 0; i < 300; i++) {
      for (const player of assignRoles(names)) {
        if (player.role === 'master') mastered.add(player.name);
        if (player.role === 'insider') insidered.add(player.name);
      }
    }
    expect(mastered.size).toBe(names.length);
    expect(insidered.size).toBe(names.length);
  });

  test('works at the minimum player count', () => {
    const players = assignRoles(names.slice(0, MIN_PLAYERS));
    expect(players).toHaveLength(MIN_PLAYERS);
    expect(players.filter((p) => p.role === 'master')).toHaveLength(1);
    expect(players.filter((p) => p.role === 'insider')).toHaveLength(1);
    expect(players.filter((p) => p.role === 'common')).toHaveLength(MIN_PLAYERS - 2);
  });

  test('rejects fewer players than the minimum', () => {
    const tooFew = names.slice(0, MIN_PLAYERS - 1);
    expect(() => assignRoles(tooFew)).toThrow(new RegExp(`at least ${MIN_PLAYERS}`, 'i'));
  });
});

describe('pickWord', () => {
  test('returns a word from the bundled list', () => {
    expect(WORDS).toContain(pickWord());
  });

  test('does not return the word it was told to avoid', () => {
    const avoided = WORDS[0];
    for (let i = 0; i < 200; i++) {
      expect(pickWord(avoided)).not.toBe(avoided);
    }
  });
});

describe('reducer', () => {
  const started = reducer(
    { ...initialState, playerCount: 4, names: ['Aphiwad', '', '', 'Mina'] },
    { type: 'startGame' },
  );

  test('starts on the setup screen with no round', () => {
    expect(initialState.screen).toBe('setup');
    expect(initialState.round).toBeNull();
  });

  test('setCount clamps to the supported range', () => {
    expect(reducer(initialState, { type: 'setCount', count: 99 }).playerCount).toBe(MAX_PLAYERS);
    expect(reducer(initialState, { type: 'setCount', count: 0 }).playerCount).toBe(MIN_PLAYERS);
  });

  test('setName records a name at its seat', () => {
    const next = reducer(initialState, { type: 'setName', index: 1, name: 'Mina' });
    expect(next.names[1]).toBe('Mina');
  });

  test('startGame builds a round and moves to the reveal screen', () => {
    expect(started.screen).toBe('reveal');
    expect(started.round?.players).toHaveLength(4);
    expect(started.round?.turn).toBe(0);
    expect(started.round?.revealed).toBe(false);
    expect(WORDS).toContain(started.round?.word);
  });

  test('startGame applies the Player N fallback to blank names', () => {
    expect(started.round?.players.map((p) => p.name)).toEqual([
      'Aphiwad',
      'Player 2',
      'Player 3',
      'Mina',
    ]);
  });

  test('showRole then hideRole advances to the next player', () => {
    const shown = reducer(started, { type: 'showRole' });
    expect(shown.round?.revealed).toBe(true);
    expect(shown.round?.turn).toBe(0);

    const hidden = reducer(shown, { type: 'hideRole', now: 1_000 });
    expect(hidden.round?.revealed).toBe(false);
    expect(hidden.round?.turn).toBe(1);
    expect(hidden.screen).toBe('reveal');
  });

  test('hiding the last role moves to the play screen', () => {
    let state = started;
    for (let i = 0; i < 4; i++) {
      state = reducer(reducer(state, { type: 'showRole' }), { type: 'hideRole', now: 1_000 });
    }
    expect(state.screen).toBe('play');
    expect(state.round?.turn).toBe(4);
  });

  test('revealAnswer moves to the summary screen', () => {
    expect(reducer(started, { type: 'revealAnswer' }).screen).toBe('summary');
  });

  test('samePlayers reshuffles into a fresh reveal with a different word', () => {
    const again = reducer(started, { type: 'samePlayers' });
    expect(again.screen).toBe('reveal');
    expect(again.round?.turn).toBe(0);
    expect(again.round?.word).not.toBe(started.round?.word);
    expect(again.round?.players.map((p) => p.name)).toEqual(
      started.round?.players.map((p) => p.name),
    );
  });

  test('newGame returns to setup but keeps the entered names', () => {
    const fresh = reducer(started, { type: 'newGame' });
    expect(fresh.screen).toBe('setup');
    expect(fresh.round).toBeNull();
    expect(fresh.names).toEqual(started.names);
  });

  test('openRules remembers where to go back to', () => {
    const rules = reducer(initialState, { type: 'openRules' });
    expect(rules.screen).toBe('rules');
    expect(reducer(rules, { type: 'closeRules' }).screen).toBe('setup');
  });
});

describe('round limits', () => {
  const startWith = (state: Partial<State>) =>
    reducer({ ...initialState, ...state }, { type: 'startGame' });

  test('defaults to a five minute round', () => {
    expect(initialState.mode).toBe('time');
    expect(initialState.minutes).toBe(5);
  });

  test('defaults to twenty questions when that mode is chosen', () => {
    expect(initialState.questions).toBe(20);
  });

  test('setMode switches between the two modes', () => {
    const questions = reducer(initialState, { type: 'setMode', mode: 'questions' });
    expect(questions.mode).toBe('questions');
    expect(reducer(questions, { type: 'setMode', mode: 'time' }).mode).toBe('time');
  });

  test('setMinutes clamps to the supported range', () => {
    expect(reducer(initialState, { type: 'setMinutes', minutes: 99 }).minutes).toBe(MAX_MINUTES);
    expect(reducer(initialState, { type: 'setMinutes', minutes: 0 }).minutes).toBe(MIN_MINUTES);
  });

  test('setQuestions clamps to the supported range', () => {
    expect(reducer(initialState, { type: 'setQuestions', questions: 500 }).questions).toBe(
      MAX_QUESTIONS,
    );
    expect(reducer(initialState, { type: 'setQuestions', questions: 1 }).questions).toBe(
      MIN_QUESTIONS,
    );
  });

  test('startGame captures the time limit', () => {
    expect(startWith({ mode: 'time', minutes: 7 }).round?.limit).toEqual({
      mode: 'time',
      minutes: 7,
    });
  });

  test('startGame captures the question limit', () => {
    expect(startWith({ mode: 'questions', questions: 30 }).round?.limit).toEqual({
      mode: 'questions',
      questions: 30,
    });
  });

  test('a round starts with no questions asked', () => {
    expect(startWith({ mode: 'questions' }).round?.asked).toBe(0);
  });

  test('askQuestion counts down the questions left', () => {
    const state = startWith({ mode: 'questions', questions: 5 });
    const asked = reducer(reducer(state, { type: 'askQuestion' }), { type: 'askQuestion' });
    expect(asked.round?.asked).toBe(2);
    expect(questionsLeft(asked.round!)).toBe(3);
  });

  test('askQuestion never counts past the limit', () => {
    let state = startWith({ mode: 'questions', questions: 5 });
    for (let i = 0; i < 10; i++) state = reducer(state, { type: 'askQuestion' });
    expect(state.round?.asked).toBe(5);
    expect(questionsLeft(state.round!)).toBe(0);
  });

  test('askQuestion does nothing in time mode', () => {
    const state = reducer(startWith({ mode: 'time' }), { type: 'askQuestion' });
    expect(state.round?.asked).toBe(0);
  });

  test('questionsLeft is null in time mode', () => {
    expect(questionsLeft(startWith({ mode: 'time' }).round!)).toBeNull();
  });

  test('changing the setup mid-round leaves the round untouched', () => {
    const state = startWith({ mode: 'questions', questions: 10 });
    const fiddled = reducer(state, { type: 'setQuestions', questions: 50 });
    expect(fiddled.round?.limit).toEqual({ mode: 'questions', questions: 10 });
  });

  test('samePlayers starts the next round with a fresh question count', () => {
    let state = startWith({ mode: 'questions', questions: 5 });
    state = reducer(state, { type: 'askQuestion' });
    const again = reducer(state, { type: 'samePlayers' });
    expect(again.round?.asked).toBe(0);
    expect(again.round?.limit).toEqual({ mode: 'questions', questions: 5 });
  });
});

describe('secondsLeftOf', () => {
  test('is null without a clock', () => {
    expect(secondsLeftOf(null, 0)).toBeNull();
  });

  test('counts down to a running clock deadline', () => {
    expect(secondsLeftOf({ state: 'running', endsAt: 60_000 }, 0)).toBe(60);
    expect(secondsLeftOf({ state: 'running', endsAt: 60_000 }, 30_000)).toBe(30);
  });

  test('rounds a part-second up, so 0 means truly out of time', () => {
    expect(secondsLeftOf({ state: 'running', endsAt: 60_000 }, 59_500)).toBe(1);
    expect(secondsLeftOf({ state: 'running', endsAt: 60_000 }, 60_000)).toBe(0);
  });

  test('never goes negative past the deadline', () => {
    expect(secondsLeftOf({ state: 'running', endsAt: 60_000 }, 90_000)).toBe(0);
  });

  test('a paused clock holds its remaining time whatever the wall clock says', () => {
    const paused = { state: 'paused', msLeft: 42_000 } as const;
    expect(secondsLeftOf(paused, 0)).toBe(42);
    expect(secondsLeftOf(paused, 9_999_999)).toBe(42);
  });
});

describe('the round clock', () => {
  const NOW = 1_700_000_000_000;

  /** Deals every role and hides the last card, landing on the play screen. */
  const playFrom = (state: Partial<State>, now = NOW) => {
    let s = reducer({ ...initialState, playerCount: MIN_PLAYERS, ...state }, { type: 'startGame' });
    for (let i = 0; i < MIN_PLAYERS; i++) {
      s = reducer(reducer(s, { type: 'showRole' }), { type: 'hideRole', now });
    }
    return s;
  };

  test('a fresh round has no clock yet', () => {
    const state = reducer({ ...initialState, playerCount: MIN_PLAYERS }, { type: 'startGame' });
    expect(state.round?.clock).toBeNull();
  });

  test('the clock starts when the last card is hidden', () => {
    const state = playFrom({ mode: 'time', minutes: 5 });
    expect(state.screen).toBe('play');
    expect(state.round?.clock).toEqual({ state: 'running', endsAt: NOW + 300_000 });
  });

  test('question mode never gets a clock', () => {
    expect(playFrom({ mode: 'questions' }).round?.clock).toBeNull();
  });

  test('the clock does not start mid-reveal', () => {
    let state = reducer({ ...initialState, playerCount: MIN_PLAYERS }, { type: 'startGame' });
    state = reducer(reducer(state, { type: 'showRole' }), { type: 'hideRole', now: NOW });
    expect(state.screen).toBe('reveal');
    expect(state.round?.clock).toBeNull();
  });

  test('pausing banks the time that was left', () => {
    const state = playFrom({ mode: 'time', minutes: 5 });
    const paused = reducer(state, { type: 'pauseClock', now: NOW + 20_000 });
    expect(paused.round?.clock).toEqual({ state: 'paused', msLeft: 280_000 });
  });

  test('pausing past the deadline banks nothing', () => {
    const state = playFrom({ mode: 'time', minutes: 5 });
    const paused = reducer(state, { type: 'pauseClock', now: NOW + 400_000 });
    expect(paused.round?.clock).toEqual({ state: 'paused', msLeft: 0 });
  });

  test('resuming sets a new deadline from the banked time', () => {
    const paused = reducer(playFrom({ mode: 'time', minutes: 5 }), {
      type: 'pauseClock',
      now: NOW + 20_000,
    });
    const resumed = reducer(paused, { type: 'resumeClock', now: NOW + 999_999 });
    expect(resumed.round?.clock).toEqual({
      state: 'running',
      endsAt: NOW + 999_999 + 280_000,
    });
  });

  test('pausing an already paused clock changes nothing', () => {
    const paused = reducer(playFrom({ mode: 'time', minutes: 5 }), {
      type: 'pauseClock',
      now: NOW + 20_000,
    });
    expect(reducer(paused, { type: 'pauseClock', now: NOW + 30_000 }).round?.clock).toEqual(
      paused.round?.clock,
    );
  });

  test('resuming a running clock changes nothing', () => {
    const running = playFrom({ mode: 'time', minutes: 5 });
    expect(reducer(running, { type: 'resumeClock', now: NOW + 30_000 }).round?.clock).toEqual(
      running.round?.clock,
    );
  });

  test('a new round with the same players gets a fresh clock', () => {
    const again = reducer(playFrom({ mode: 'time', minutes: 5 }), { type: 'samePlayers' });
    expect(again.round?.clock).toBeNull();
  });
});

describe('startOver', () => {
  test('throws away the game and returns to a blank setup', () => {
    const state = reducer(
      { ...initialState, playerCount: 5, names: ['Mina', '', '', '', ''], minutes: 9 },
      { type: 'startGame' },
    );
    expect(reducer(state, { type: 'startOver' })).toEqual(initialState);
  });
});
