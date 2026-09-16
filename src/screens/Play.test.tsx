// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MIN_PLAYERS, initialState, reducer } from '../game';
import type { Action, Round } from '../game';
import Play from './Play';

afterEach(cleanup);

/** A round sitting on the play screen, bounded however the caller asks. */
function playingRound(limit: Partial<typeof initialState>): Round {
  let state = reducer(
    { ...initialState, playerCount: MIN_PLAYERS, ...limit },
    { type: 'startGame' },
  );
  for (let i = 0; i < MIN_PLAYERS; i++) {
    state = reducer(reducer(state, { type: 'showRole' }), { type: 'hideRole', now: Date.now() });
  }
  return state.round!;
}

function renderPlay(round: Round) {
  const dispatch = vi.fn<(action: Action) => void>();
  render(<Play round={round} dispatch={dispatch} />);
  return dispatch;
}

const sheet = () => screen.queryByRole('dialog');
const cancelButton = () => screen.getByRole('button', { name: /Not yet/ });

const tapReveal = () =>
  fireEvent.click(screen.getByRole('button', { name: /^Reveal the answer$/ }));
const tapConfirm = () => fireEvent.click(screen.getByRole('button', { name: /Reveal it/ }));
const tapCancel = () => fireEvent.click(cancelButton());
const tapBackdrop = () => fireEvent.click(screen.getByTestId('sheet-backdrop'));
const pressEscape = () => fireEvent.keyDown(document, { key: 'Escape' });

describe('confirming a reveal while the round is live', () => {
  test('the first tap asks instead of revealing', () => {
    const dispatch = renderPlay(playingRound({ mode: 'time', minutes: 5 }));
    tapReveal();
    expect(sheet()).toBeTruthy();
    expect(dispatch).not.toHaveBeenCalled();
  });

  test('confirming reveals the answer', () => {
    const dispatch = renderPlay(playingRound({ mode: 'time', minutes: 5 }));
    tapReveal();
    tapConfirm();
    expect(dispatch).toHaveBeenCalledWith({ type: 'revealAnswer' });
  });

  test('the cancel button holds focus, so a stray Enter cannot reveal', () => {
    renderPlay(playingRound({ mode: 'time', minutes: 5 }));
    tapReveal();
    expect(document.activeElement).toBe(cancelButton());
  });

  test('cancelling closes the sheet and reveals nothing', () => {
    const dispatch = renderPlay(playingRound({ mode: 'time', minutes: 5 }));
    tapReveal();
    tapCancel();
    expect(sheet()).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });

  test('Escape closes the sheet and reveals nothing', () => {
    const dispatch = renderPlay(playingRound({ mode: 'time', minutes: 5 }));
    tapReveal();
    expect(sheet()).toBeTruthy();
    pressEscape();
    expect(sheet()).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });

  test('tapping the backdrop closes the sheet and reveals nothing', () => {
    const dispatch = renderPlay(playingRound({ mode: 'time', minutes: 5 }));
    tapReveal();
    tapBackdrop();
    expect(sheet()).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });

  test('asking again after cancelling still works', () => {
    const dispatch = renderPlay(playingRound({ mode: 'time', minutes: 5 }));
    tapReveal();
    tapCancel();
    tapReveal();
    expect(sheet()).toBeTruthy();
    tapConfirm();
    expect(dispatch).toHaveBeenCalledWith({ type: 'revealAnswer' });
  });

  test('a question-mode round asks too', () => {
    const dispatch = renderPlay(playingRound({ mode: 'questions', questions: 5 }));
    tapReveal();
    expect(sheet()).toBeTruthy();
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe('revealing once the round is spent', () => {
  test('a used-up question budget reveals without asking', () => {
    const round = playingRound({ mode: 'questions', questions: 5 });
    const dispatch = renderPlay({ ...round, asked: 5 });
    tapReveal();
    expect(sheet()).toBeNull();
    expect(dispatch).toHaveBeenCalledWith({ type: 'revealAnswer' });
  });

  test('an expired clock reveals without asking', () => {
    const round = playingRound({ mode: 'time', minutes: 5 });
    const dispatch = renderPlay({
      ...round,
      clock: { state: 'running', endsAt: Date.now() - 1_000 },
    });
    tapReveal();
    expect(sheet()).toBeNull();
    expect(dispatch).toHaveBeenCalledWith({ type: 'revealAnswer' });
  });
});
