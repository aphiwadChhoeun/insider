import type { Action, Role, Round } from '../game';

type Props = {
  round: Round;
  dispatch: (action: Action) => void;
};

const ROLE_LABEL: Record<Role, string> = {
  master: 'Master',
  insider: 'Insider',
  common: 'Common',
};

const ROLE_BRIEF: Record<Role, string> = {
  master: 'Answer the questions. You know the word.',
  insider: 'You know the word too. Steer them there without getting caught.',
  common: 'Find the word with questions. One of you already knows it.',
};

export default function Reveal({ round, dispatch }: Props) {
  const player = round.players[round.turn];
  const knowsWord = player.role !== 'common';

  if (!round.revealed) {
    return (
      <div className="screen centered">
        <p className="eyebrow">
          Player {round.turn + 1} of {round.players.length}
        </p>
        <h1 className="title">Pass the phone to</h1>
        <p className="big-name">{player.name}</p>
        <p className="hint">Everyone else: look away.</p>
        <footer className="screen-foot">
          <button
            type="button"
            className="button primary"
            onClick={() => dispatch({ type: 'showRole' })}
          >
            I&rsquo;m {player.name} &mdash; show my role
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div className={`screen centered card role-${player.role}`}>
      <p className="eyebrow">{player.name}, you are the</p>
      <h1 className="role-name">{ROLE_LABEL[player.role]}</h1>
      <p className="role-brief">{ROLE_BRIEF[player.role]}</p>

      {knowsWord ? (
        <div className="word-box">
          <p className="word-label">The secret word</p>
          <p className="word">{round.word}</p>
        </div>
      ) : (
        <div className="word-box muted">
          <p className="word-label">The secret word</p>
          <p className="word hidden-word">? ? ?</p>
        </div>
      )}

      <footer className="screen-foot">
        <button
          type="button"
          className="button primary"
          onClick={() => dispatch({ type: 'hideRole', now: Date.now() })}
        >
          {round.turn + 1 === round.players.length ? 'Hide & finish' : 'Hide & pass on'}
        </button>
      </footer>
    </div>
  );
}
