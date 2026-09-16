import { useCallback, useState } from 'react';
import type { CSSProperties } from 'react';
import { questionsLeft } from '../game';
import type { Action, Round } from '../game';
import { formatClock, useClock } from '../useClock';
import ConfirmSheet from '../components/ConfirmSheet';
import Electrify from '../components/Electrify';

type Props = {
  round: Round;
  dispatch: (action: Action) => void;
};

export default function Play({ round, dispatch }: Props) {
  const onClock = round.limit.mode === 'time';
  const secondsLeft = useClock(round.clock);
  const paused = round.clock?.state === 'paused';
  const left = questionsLeft(round);
  const spent = onClock ? secondsLeft === 0 : left === 0;

  const [asking, setAsking] = useState(false);
  const stopAsking = useCallback(() => setAsking(false), []);
  const revealAnswer = () => dispatch({ type: 'revealAnswer' });

  // How much of the round is still in hand, 1 → 0, for the meter under the count.
  const remaining =
    round.limit.mode === 'time'
      ? (secondsLeft ?? 0) / (round.limit.minutes * 60)
      : (left ?? 0) / round.limit.questions;

  return (
    <div className="screen centered">
      {spent ? (
        <>
          <p className="eyebrow">{onClock ? "Time's up" : 'Out of questions'}</p>
          <h1 className="title">The Commons never found it</h1>
          <p className="lede">
            Unless someone said the word just in time, nobody wins this round. Talk it out, then
            reveal.
          </p>
        </>
      ) : onClock ? (
        <>
          <p className="eyebrow">{paused ? 'Paused' : 'Time left'}</p>
          <p className={`clock${paused ? ' dim' : ''}`}>{formatClock(secondsLeft ?? 0)}</p>
          <Meter remaining={remaining} dim={paused} />
          <p className="lede">
            Ask the Master yes/no questions until someone says the word out loud.
          </p>
        </>
      ) : (
        <>
          <p className="clock">{left}</p>
          <p className="eyebrow">{left === 1 ? 'question left' : 'questions left'}</p>
          <Meter remaining={remaining} />
          <p className="lede">Tap once for every question the group asks the Master.</p>
        </>
      )}

      <footer className="screen-foot">
        {!spent &&
          (onClock ? (
            <button
              type="button"
              className="button ghost"
              onClick={() =>
                dispatch({ type: paused ? 'resumeClock' : 'pauseClock', now: Date.now() })
              }
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
          ) : (
            <button
              type="button"
              className="button tally"
              onClick={() => dispatch({ type: 'askQuestion' })}
            >
              Question asked
            </button>
          ))}
        <button
          type="button"
          className="button primary"
          onClick={() => (spent ? revealAnswer() : setAsking(true))}
        >
          <Electrify />
          Reveal the answer
        </button>
        <button
          type="button"
          className="button ghost"
          onClick={() => dispatch({ type: 'openRules' })}
        >
          How to play
        </button>
      </footer>

      {asking && (
        <ConfirmSheet
          title="Reveal the word and roles?"
          body="This ends the round for everyone. Make sure the group has finished voting."
          confirmLabel="Reveal it — everyone's ready"
          cancelLabel="Not yet"
          onConfirm={revealAnswer}
          onCancel={stopAsking}
        />
      )}
    </div>
  );
}

/** Decorative drain bar; the count above it is the accessible reading. */
function Meter({ remaining, dim = false }: { remaining: number; dim?: boolean }) {
  const fill = Math.min(1, Math.max(0, remaining));

  return (
    <div
      className={`meter${dim ? ' dim' : ''}`}
      style={{ '--fill': fill } as CSSProperties}
      aria-hidden="true"
    />
  );
}
