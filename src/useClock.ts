import { useEffect, useState } from 'react';
import { secondsLeftOf } from './game';
import type { Clock } from './game';

/** Sub-second so the display is never visibly stale after a reload. */
const TICK_MS = 250;

/**
 * Seconds left on a round clock, or null when there isn't one. The clock itself
 * is a deadline held in game state; this hook only re-reads it as time passes.
 */
export function useClock(clock: Clock | null): number | null {
  const [secondsLeft, setSecondsLeft] = useState(() => secondsLeftOf(clock, Date.now()));

  useEffect(() => {
    setSecondsLeft(secondsLeftOf(clock, Date.now()));
    if (clock?.state !== 'running') return;

    const id = setInterval(() => {
      setSecondsLeft(secondsLeftOf(clock, Date.now()));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [clock]);

  return secondsLeft;
}

export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
