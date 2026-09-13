import type { DriverRun } from './driver-api';

/** Recomputed from active runs returned by the driver API, never stored as a stale total. */
export function summarizeDriverCommitment(runs: DriverRun[]) {
  return {
    totalPriceRials: runs.reduce((sum, run) => sum + (run.contractPriceRials ?? 0), 0),
    contractDate: runs.find((run) => run.contractDate)?.contractDate ?? null,
    routesComplete: runs.length > 0 && runs.every((run) => run.contractPriceRials != null && Boolean(run.contractDate)),
  };
}
