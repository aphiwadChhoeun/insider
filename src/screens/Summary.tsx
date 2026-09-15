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

export default function Summary({ round, dispatch }: Props) {
  return (
    <div className="screen">
      <header className="screen-head">
        <p className="eyebrow">The word was</p>
        <h1 className="word">{round.word}</h1>
      </header>

      <section className="panel">
        <h2 className="panel-title">Everyone&rsquo;s role</h2>
        <ul className="roster">
          {round.players.map((player) => (
            <li key={player.name} className={`roster-row role-${player.role}`}>
              <span className="roster-name">{player.name}</span>
              <span className="roster-role">{ROLE_LABEL[player.role]}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="screen-foot">
        <button
          type="button"
          className="button primary"
          onClick={() => dispatch({ type: 'samePlayers' })}
        >
          New round, same players
        </button>
        <button
          type="button"
          className="button ghost"
          onClick={() => dispatch({ type: 'newGame' })}
        >
          New game
        </button>
      </footer>
    </div>
  );
}
