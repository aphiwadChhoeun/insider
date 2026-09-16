import {
  MAX_MINUTES,
  MAX_PLAYERS,
  MAX_QUESTIONS,
  MIN_MINUTES,
  MIN_PLAYERS,
  MIN_QUESTIONS,
  QUESTION_STEP,
} from '../game';
import type { Action, State } from '../game';
import Electrify from '../components/Electrify';

type Props = {
  state: State;
  dispatch: (action: Action) => void;
};

export default function Setup({ state, dispatch }: Props) {
  const seats = Array.from({ length: state.playerCount }, (_, i) => i);

  return (
    <div className="screen">
      <header className="screen-head">
        <p className="classification">Classified &middot; eyes only</p>
        <h1 className="title brand">Insider</h1>
        <p className="subtitle">Pass-the-phone role dealer</p>
      </header>

      <section className="panel">
        <h2 className="panel-title">
          How many players?
          <span className="panel-code">01</span>
        </h2>
        <Stepper
          value={state.playerCount}
          min={MIN_PLAYERS}
          max={MAX_PLAYERS}
          step={1}
          noun="player"
          onChange={(count) => dispatch({ type: 'setCount', count })}
        />
        <p className="hint">1 Master &middot; 1 Insider &middot; {state.playerCount - 2} Common</p>
      </section>

      <section className="panel">
        <h2 className="panel-title">
          How does the round end?
          <span className="panel-code">02</span>
        </h2>
        <div className="segmented" role="group" aria-label="Round limit">
          <button
            type="button"
            className={`segment${state.mode === 'time' ? ' on' : ''}`}
            aria-pressed={state.mode === 'time'}
            onClick={() => dispatch({ type: 'setMode', mode: 'time' })}
          >
            Time
          </button>
          <button
            type="button"
            className={`segment${state.mode === 'questions' ? ' on' : ''}`}
            aria-pressed={state.mode === 'questions'}
            onClick={() => dispatch({ type: 'setMode', mode: 'questions' })}
          >
            Questions
          </button>
        </div>

        {state.mode === 'time' ? (
          <>
            <Stepper
              value={state.minutes}
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              step={1}
              noun="minute"
              unit={state.minutes === 1 ? 'min' : 'mins'}
              onChange={(minutes) => dispatch({ type: 'setMinutes', minutes })}
            />
            <p className="hint">The phone counts down while you play.</p>
          </>
        ) : (
          <>
            <Stepper
              value={state.questions}
              min={MIN_QUESTIONS}
              max={MAX_QUESTIONS}
              step={QUESTION_STEP}
              noun="question"
              unit="questions"
              onChange={(questions) => dispatch({ type: 'setQuestions', questions })}
            />
            <p className="hint">Tap the phone once per question asked.</p>
          </>
        )}
      </section>

      <section className="panel">
        <h2 className="panel-title">
          Names <span className="panel-note">optional</span>
          <span className="panel-code">03</span>
        </h2>
        <div className="name-list">
          {seats.map((seat) => (
            <input
              key={seat}
              className="name-input"
              type="text"
              inputMode="text"
              autoComplete="off"
              maxLength={16}
              placeholder={`Player ${seat + 1}`}
              value={state.names[seat]}
              onChange={(e) => dispatch({ type: 'setName', index: seat, name: e.target.value })}
            />
          ))}
        </div>
      </section>

      <footer className="screen-foot">
        <button
          type="button"
          className="button primary"
          onClick={() => dispatch({ type: 'startGame' })}
        >
          <Electrify />
          Start game
        </button>
        <button
          type="button"
          className="button ghost"
          onClick={() => dispatch({ type: 'openRules' })}
        >
          How to play
        </button>
      </footer>
    </div>
  );
}

type StepperProps = {
  value: number;
  min: number;
  max: number;
  step: number;
  /** Singular noun used in the button labels, e.g. "player". */
  noun: string;
  /** Shown next to the value; omit for a bare number. */
  unit?: string;
  onChange: (value: number) => void;
};

function Stepper({ value, min, max, step, noun, unit, onChange }: StepperProps) {
  return (
    <div className="stepper">
      <button
        type="button"
        className="stepper-button"
        aria-label={`Fewer ${noun}s`}
        disabled={value <= min}
        onClick={() => onChange(value - step)}
      >
        −
      </button>
      <span className="stepper-value" aria-live="polite">
        {value}
        {unit && <span className="stepper-unit">{unit}</span>}
      </span>
      <button
        type="button"
        className="stepper-button"
        aria-label={`More ${noun}s`}
        disabled={value >= max}
        onClick={() => onChange(value + step)}
      >
        +
      </button>
    </div>
  );
}
