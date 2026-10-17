import type { DriverRun } from './driver-api';

/** A contract belongs to exactly one route, never to the driver's route total. */
export function isDriverRouteContractReady(run: DriverRun): boolean {
  return run.contractPriceRials != null && Boolean(run.contractDate);
}
