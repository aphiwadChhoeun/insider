import { WORDS } from './words';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 12;
export const MIN_MINUTES = 1;
export const MAX_MINUTES = 15;
export const MIN_QUESTIONS = 5;
export const MAX_QUESTIONS = 50;
/** Step size for the question stepper; minutes step by 1. */
export const QUESTION_STEP = 5;

export type Role = 'master' | 'insider' | 'common';

/** How the round is bounded: by the clock, or by a question budget. */
export type Mode = 'time' | 'questions';

export type Limit = { mode: 'time'; minutes: number } | { mode: 'questions'; questions: number };

/**
 * The round clock, as an absolute deadline rather than a countdown, so it
 * survives being written to storage and read back after a reload.
 */
export type Clock = { state: 'running'; endsAt: number } | { state: 'paused'; msLeft: number };

export type Player = {
  name: string;
  role: Role;
};

export type Round = {
  word: string;
  players: Player[];
  /** Index of the player whose turn it is to take the phone. */
  turn: number;
  /** True while the current player's role card is face up. */
  revealed: boolean;
  /** Captured at start, so later setup edits can't change a live round. */
  limit: Limit;
  /** Questions asked so far; stays 0 in time mode. */
  asked: number;
  /** Starts when the last card is hidden; null in question mode. */
  clock: Clock | null;
};

export type Screen = 'setup' | 'reveal' | 'play' | 'summary' | 'rules';

export type State = {
  screen: Screen;
  /** Where closing the rules screen returns to. */
  returnScreen: Screen;
  playerCount: number;
  /** Raw name entries by seat; blanks become "Player N" at game start. */
  names: string[];
  mode: Mode;
  /** Minutes to use when mode is 'time'. */
  minutes: number;
  /** Question budget to use when mode is 'questions'. */
  questions: number;
  round: Round | null;
};

export type Action =
  | { type: 'setCount'; count: number }
  | { type: 'setName'; index: number; name: string }
  | { type: 'setMode'; mode: Mode }
  | { type: 'setMinutes'; minutes: number }
  | { type: 'setQuestions'; questions: number }
  | { type: 'startGame' }
  | { type: 'askQuestion' }
  | { type: 'showRole' }
  /** `now` seeds the round clock if this hides the last card. */
  | { type: 'hideRole'; now: number }
  | { type: 'pauseClock'; now: number }
  | { type: 'resumeClock'; now: number }
  | { type: 'revealAnswer' }
  | { type: 'samePlayers' }
  | { type: 'newGame' }
  | { type: 'startOver' }
  | { type: 'openRules' }
  | { type: 'closeRules' };

export const initialState: State = {
  screen: 'setup',
  returnScreen: 'setup',
  playerCount: 4,
  names: Array.from({ length: MAX_PLAYERS }, () => ''),
  mode: 'time',
  minutes: 5,
  questions: 20,
  round: null,
};

export function resolveNames(entries: string[]): string[] {
  return entries.map((entry, index) => entry.trim() || `Player ${index + 1}`);
}

export function assignRoles(names: string[]): Player[] {
  if (names.length < MIN_PLAYERS) {
    throw new Error(`Insider needs at least ${MIN_PLAYERS} players`);
  }
  const roles: Role[] = [
    'master',
    'insider',
    ...Array.from<unknown, Role>({ length: names.length - 2 }, () => 'common'),
  ];
  const shuffled = shuffle(roles);
  return names.map((name, index) => ({ name, role: shuffled[index] }));
}

/** Questions the group has left, or null when the round is on the clock. */
export function questionsLeft(round: Round): number | null {
  if (round.limit.mode !== 'questions') return null;
  return round.limit.questions - round.asked;
}

/** Whole seconds left on a clock, rounded up, or null when there is no clock. */
export function secondsLeftOf(clock: Clock | null, now: number): number | null {
  if (!clock) return null;
  const msLeft = clock.state === 'running' ? clock.endsAt - now : clock.msLeft;
  return Math.max(Math.ceil(msLeft / 1000), 0);
}

export function pickWord(avoid?: string): string {
  const pool = avoid ? WORDS.filter((word) => word !== avoid) : WORDS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'setCount':
      return { ...state, playerCount: clamp(action.count, MIN_PLAYERS, MAX_PLAYERS) };

    case 'setName': {
      const names = [...state.names];
      names[action.index] = action.name;
      return { ...state, names };
    }

    case 'setMode':
      return { ...state, mode: action.mode };

    case 'setMinutes':
      return { ...state, minutes: clamp(action.minutes, MIN_MINUTES, MAX_MINUTES) };

    case 'setQuestions':
      return { ...state, questions: clamp(action.questions, MIN_QUESTIONS, MAX_QUESTIONS) };

    case 'startGame':
      return {
        ...state,
        screen: 'reveal',
        returnScreen: 'reveal',
        round: newRound(
          resolveNames(state.names.slice(0, state.playerCount)),
          currentLimit(state),
        ),
      };

    case 'askQuestion': {
      const left = state.round && questionsLeft(state.round);
      if (!state.round || left === null || left === 0) return state;
      return { ...state, round: { ...state.round, asked: state.round.asked + 1 } };
    }

    case 'showRole':
      return state.round ? { ...state, round: { ...state.round, revealed: true } } : state;

    case 'hideRole': {
      if (!state.round) return state;
      const { limit } = state.round;
      const turn = state.round.turn + 1;
      const done = turn >= state.round.players.length;
      const clock: Clock | null =
        done && limit.mode === 'time'
          ? { state: 'running', endsAt: action.now + limit.minutes * 60_000 }
          : state.round.clock;
      return {
        ...state,
        screen: done ? 'play' : 'reveal',
        returnScreen: done ? 'play' : 'reveal',
        round: { ...state.round, turn, revealed: false, clock },
      };
    }

    case 'pauseClock': {
      const clock = state.round?.clock;
      if (!state.round || clock?.state !== 'running') return state;
      return {
        ...state,
        round: {
          ...state.round,
          clock: { state: 'paused', msLeft: Math.max(clock.endsAt - action.now, 0) },
        },
      };
    }

    case 'resumeClock': {
      const clock = state.round?.clock;
      if (!state.round || clock?.state !== 'paused') return state;
      return {
        ...state,
        round: { ...state.round, clock: { state: 'running', endsAt: action.now + clock.msLeft } },
      };
    }

    case 'revealAnswer':
      return { ...state, screen: 'summary', returnScreen: 'summary' };

    case 'samePlayers': {
      if (!state.round) return state;
      const names = state.round.players.map((player) => player.name);
      return {
        ...state,
        screen: 'reveal',
        returnScreen: 'reveal',
        round: newRound(names, currentLimit(state), state.round.word),
      };
    }

    case 'newGame':
      return { ...state, screen: 'setup', returnScreen: 'setup', round: null };

    case 'startOver':
      return initialState;

    case 'openRules':
      return { ...state, screen: 'rules', returnScreen: state.screen };

    case 'closeRules':
      return { ...state, screen: state.returnScreen };
  }
}

function newRound(names: string[], limit: Limit, avoidWord?: string): Round {
  return {
    word: pickWord(avoidWord),
    players: assignRoles(names),
    turn: 0,
    revealed: false,
    limit,
    asked: 0,
    clock: null,
  };
}

function currentLimit(state: State): Limit {
  return state.mode === 'time'
    ? { mode: 'time', minutes: state.minutes }
    : { mode: 'questions', questions: state.questions };
}

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
