import {
  MAX_MINUTES,
  MAX_PLAYERS,
  MAX_QUESTIONS,
  MIN_MINUTES,
  MIN_PLAYERS,
  MIN_QUESTIONS,
} from './game';
import type { Clock, Limit, Mode, Player, Role, Round, Screen, State } from './game';

/** Bumping the version retires old saves instead of trying to read them. */
export const STORAGE_KEY = 'insider:state:v1';

export function load(): State | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseState(JSON.parse(raw)) : null;
  } catch {
    // Unreadable, non-JSON, or a browser that denies storage access.
    return null;
  }
}

export function save(state: State): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Full or denied storage shouldn't take the game down with it.
  }
}

export function clear(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing useful to do if the browser won't let us.
  }
}

const SCREENS: Screen[] = ['setup', 'reveal', 'play', 'summary', 'rules'];
const MODES: Mode[] = ['time', 'questions'];
const ROLES: Role[] = ['master', 'insider', 'common'];
/** Screens that make no sense without a round to show. */
const NEEDS_ROUND: Screen[] = ['reveal', 'play', 'summary'];

/**
 * Turn whatever was in storage into usable state: null if it is too broken to
 * trust, otherwise repaired in place (values clamped, arrays resized) and with
 * the current card face down, so a reload can't expose a role to the wrong
 * person.
 */
export function parseState(raw: unknown): State | null {
  if (!isRecord(raw)) return null;

  const screen = asScreen(raw.screen);
  const mode = MODES.find((m) => m === raw.mode);
  if (!screen || !mode) return null;
  if (!isFiniteNumber(raw.playerCount) || !isFiniteNumber(raw.minutes)) return null;
  if (!isFiniteNumber(raw.questions)) return null;
  if (!Array.isArray(raw.names) || raw.names.some((name) => typeof name !== 'string')) return null;

  const round = raw.round === null || raw.round === undefined ? null : parseRound(raw.round);
  if (raw.round && !round) return null;

  // A screen with nothing to render would leave the player staring at a blank
  // page, so drop back to setup instead.
  const usable = round || !NEEDS_ROUND.includes(screen);

  // The reveal screen reads players[turn], so it needs a turn that points at
  // somebody — unlike the play screen, where "past the last player" is normal.
  if (round && screen === 'reveal' && round.turn >= round.players.length) {
    round.turn = round.players.length - 1;
  }

  return {
    screen: usable ? screen : 'setup',
    returnScreen: usable ? (asScreen(raw.returnScreen) ?? 'setup') : 'setup',
    playerCount: clamp(raw.playerCount, MIN_PLAYERS, MAX_PLAYERS),
    names: resize(raw.names as string[], MAX_PLAYERS),
    mode,
    minutes: clamp(raw.minutes, MIN_MINUTES, MAX_MINUTES),
    questions: clamp(raw.questions, MIN_QUESTIONS, MAX_QUESTIONS),
    round,
  };
}

function parseRound(raw: unknown): Round | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.word !== 'string' || !raw.word) return null;
  if (!Array.isArray(raw.players) || raw.players.length < MIN_PLAYERS) return null;

  const players: Player[] = [];
  for (const entry of raw.players) {
    if (!isRecord(entry) || typeof entry.name !== 'string') return null;
    const role = ROLES.find((r) => r === entry.role);
    if (!role) return null;
    players.push({ name: entry.name, role });
  }

  const limit = parseLimit(raw.limit);
  if (!limit) return null;

  const clock = raw.clock === null || raw.clock === undefined ? null : parseClock(raw.clock);
  if (raw.clock && !clock) return null;

  if (!isFiniteNumber(raw.turn) || !isFiniteNumber(raw.asked)) return null;

  return {
    word: raw.word,
    players,
    // Reveal order is over once turn passes the last player, so allow
    // players.length itself — that is the "everyone has seen it" position.
    turn: clamp(raw.turn, 0, players.length),
    revealed: false,
    limit,
    asked: clamp(raw.asked, 0, limit.mode === 'questions' ? limit.questions : 0),
    clock,
  };
}

function parseLimit(raw: unknown): Limit | null {
  if (!isRecord(raw)) return null;
  if (raw.mode === 'time' && isFiniteNumber(raw.minutes)) {
    return { mode: 'time', minutes: clamp(raw.minutes, MIN_MINUTES, MAX_MINUTES) };
  }
  if (raw.mode === 'questions' && isFiniteNumber(raw.questions)) {
    return { mode: 'questions', questions: clamp(raw.questions, MIN_QUESTIONS, MAX_QUESTIONS) };
  }
  return null;
}

function parseClock(raw: unknown): Clock | null {
  if (!isRecord(raw)) return null;
  if (raw.state === 'running' && isFiniteNumber(raw.endsAt)) {
    return { state: 'running', endsAt: raw.endsAt };
  }
  if (raw.state === 'paused' && isFiniteNumber(raw.msLeft)) {
    return { state: 'paused', msLeft: Math.max(raw.msLeft, 0) };
  }
  return null;
}

function asScreen(value: unknown): Screen | null {
  return SCREENS.find((screen) => screen === value) ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function resize(names: string[], length: number): string[] {
  return Array.from({ length }, (_, i) => names[i] ?? '');
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.trunc(value), min), max);
}
