import { useEffect, useReducer } from 'react';
import { initialState, reducer } from './game';
import { load, save } from './storage';
import Setup from './screens/Setup';
import Reveal from './screens/Reveal';
import Play from './screens/Play';
import Summary from './screens/Summary';
import Rules from './screens/Rules';

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState, (fallback) => load() ?? fallback);

  useEffect(() => {
    save(state);
  }, [state]);

  return (
    <main className="app">
      {state.screen === 'setup' && <Setup state={state} dispatch={dispatch} />}
      {state.screen === 'rules' && <Rules dispatch={dispatch} />}
      {state.round && state.screen === 'reveal' && (
        <Reveal round={state.round} dispatch={dispatch} />
      )}
      {state.round && state.screen === 'play' && <Play round={state.round} dispatch={dispatch} />}
      {state.round && state.screen === 'summary' && (
        <Summary round={state.round} dispatch={dispatch} />
      )}
    </main>
  );
}
