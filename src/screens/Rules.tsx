import type { Action } from '../game';
import Electrify from '../components/Electrify';

type Props = {
  dispatch: (action: Action) => void;
};

export default function Rules({ dispatch }: Props) {
  return (
    <div className="screen">
      <header className="screen-head">
        <h1 className="title">How to play</h1>
      </header>

      <section className="panel prose">
        <h2 className="panel-title">
          The roles
          <span className="panel-code">Brief</span>
        </h2>
        <p>
          <strong>Master</strong> knows the secret word and answers questions with yes, no, or
          I don&rsquo;t know.
        </p>
        <p>
          <strong>Insider</strong> also knows the word, but pretends not to. Their job is to nudge
          the group toward it without being spotted.
        </p>
        <p>
          <strong>Commons</strong> know nothing. They ask questions to find the word.
        </p>
      </section>

      <section className="panel prose">
        <h2 className="panel-title">
          The round
          <span className="panel-code">Ops</span>
        </h2>
        <p>
          1. Everyone asks the Master yes/no questions until someone says the word out loud. If the
          time runs out with no answer, everyone loses.
        </p>
        <p>
          2. Once the word is found, the group discusses and votes on who the Insider was.
        </p>
        <p>
          3. Catch the Insider and everyone but the Insider wins. Vote wrong and the Insider wins
          alone.
        </p>
      </section>

      <footer className="screen-foot">
        <button
          type="button"
          className="button primary"
          onClick={() => dispatch({ type: 'closeRules' })}
        >
          <Electrify />
          Back
        </button>
        <button
          type="button"
          className="button quiet"
          onClick={() => dispatch({ type: 'startOver' })}
        >
          Start over
        </button>
      </footer>
    </div>
  );
}
