// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { Clock } from './game';
import { formatClock, useClock } from './useClock';

function Probe({ clock }: { clock: Clock | null }) {
  const secondsLeft = useClock(clock);
  return <span data-testid="left">{String(secondsLeft)}</span>;
}

const left = () => screen.getByTestId('left').textContent;

function tick(seconds: number) {
  act(() => {
    vi.advanceTimersByTime(seconds * 1000);
  });
}

describe('formatClock', () => {
  test('pads seconds to two digits', () => {
    expect(formatClock(65)).toBe('1:05');
  });

  test('renders a whole minute', () => {
    expect(formatClock(300)).toBe('5:00');
  });

  test('renders zero', () => {
    expect(formatClock(0)).toBe('0:00');
  });
});

describe('useClock', () => {
  const NOW = 1_700_000_000_000;

  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  test('reports the time left against the deadline', () => {
    render(<Probe clock={{ state: 'running', endsAt: NOW + 10_000 }} />);
    expect(left()).toBe('10');
  });

  test('ticks down as time passes', () => {
    render(<Probe clock={{ state: 'running', endsAt: NOW + 10_000 }} />);
    tick(3);
    expect(left()).toBe('7');
  });

  test('settles at zero past the deadline', () => {
    render(<Probe clock={{ state: 'running', endsAt: NOW + 2_000 }} />);
    tick(5);
    expect(left()).toBe('0');
  });

  test('a deadline already in the past reads zero immediately', () => {
    render(<Probe clock={{ state: 'running', endsAt: NOW - 60_000 }} />);
    expect(left()).toBe('0');
  });

  test('a paused clock holds still', () => {
    render(<Probe clock={{ state: 'paused', msLeft: 30_000 }} />);
    tick(10);
    expect(left()).toBe('30');
  });

  test('is null without a clock', () => {
    render(<Probe clock={null} />);
    expect(left()).toBe('null');
  });
});
