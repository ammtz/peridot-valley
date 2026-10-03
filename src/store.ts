import { useEffect, useState } from 'react';
import { Sim } from './model/sim';
import { pickSource, startLiveFeed } from './live/feed';

let singleton: Sim | null = null;

function getSim(): Sim {
  if (!singleton) singleton = new Sim();
  return singleton;
}

/**
 * Subscribes a component to the sim's render tick. The sim mutates its own
 * model and calls `notify()` (wired up here) whenever something changed;
 * this just forces a re-render so the consuming component reads fresh values
 * out of `sim.renderVals()` / `sim.m`.
 */
export function useSim(): Sim {
  const sim = getSim();
  const [, setTick] = useState(0);
  useEffect(() => {
    sim.notify = () => setTick((n) => n + 1);
    sim.start();
    // M8: real events, when a source exists. VITE_MERO_URL picks MERO's ledger (`mero serve`);
    // without it, the dev server's laptop-jobs log. Off on the deployed site, which sets neither.
    const stopLive = startLiveFeed(pickSource(import.meta.env.VITE_MERO_URL), (events, initial, moods) => sim.applyLive(events, initial, moods));
    return () => {
      stopLive();
      sim.notify = () => {};
      sim.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return sim;
}
