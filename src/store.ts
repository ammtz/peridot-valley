import { useEffect, useState } from 'react';
import { Sim } from './model/sim';
import { devServerSource, startLiveFeed } from './live/feed';

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
    // M8: real events, when a source exists (dev server today, M2's ledger later). Off on the deployed site.
    const stopLive = startLiveFeed(devServerSource, (events, initial) => sim.applyLive(events, initial));
    return () => {
      stopLive();
      sim.notify = () => {};
      sim.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return sim;
}
