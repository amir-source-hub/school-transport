# Frontend performance budgets

`budgets.json` is the single source of truth for the mobile and laptop route budgets. Run `pnpm performance:check` to enforce deterministic image policy and source-asset limits before a build.

Run a production server, then use `pnpm performance:browser -- --scope=smoke` for the stable PR subset or `pnpm performance:browser -- --scope=full` for every route/profile. The real-Chromium harness applies profile-specific network and CPU throttling with browser cache disabled, captures LCP and CLS through browser performance observers, interacts with a visible application control on each route, enforces Event Timing with an end-to-next-paint fallback, totals transferred image/JavaScript bytes and requests, and writes machine-readable JSON to `performance-results/` even when a budget fails. Set `PERFORMANCE_BROWSER_CHANNEL` to select an installed Playwright browser channel (default: `chrome`), or set `PERFORMANCE_BROWSER_EXECUTABLE_PATH` to an explicit browser executable.

The deterministic source audit and the browser audit are intentionally separate: the former catches image-policy regressions cheaply, while only the latter claims runtime measurements.
