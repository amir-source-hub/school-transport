# Service-level objectives

Window: rolling 28 days. Owner: platform on-call; product operations owns messaging spend and campaign decisions.

| Signal                         |                         Objective | Page condition                                     |
| ------------------------------ | --------------------------------: | -------------------------------------------------- |
| Authenticated API availability |                     99.9% non-5xx | 5m/1h multi-window burn > 14.4×/6×                 |
| API latency                    | 95% under 750 ms, 99% under 2.5 s | p95 > 750 ms for 15m                               |
| PostgreSQL readiness           |                            99.95% | any 5m unavailability or waiting pool > 5 for 10m  |
| Durable queue completion       |     99.9% excluding consent skips | failures > 1% for 15m or oldest notification > 15m |
| OTP provider acceptance        |         99% when provider enabled | permanent failures > 1% or timeouts > 5% for 10m   |
| Critical browser flow          |  weekly phone/tablet/desktop pass | scheduled Playwright failure                       |

Metrics contain normalized routes/status classes and bounded queue/category labels only. They must never contain account IDs, phone numbers, child data, object keys, payment references, message text, or request paths with concrete IDs. Correlate masked structured logs using `requestId` and W3C-derived `traceId`.

Error-budget policy: freeze risky releases at 50% monthly budget consumed; incident review and corrective work are required at 100%. Provider-disabled outcomes do not consume provider SLO budget but do consume feature-availability review.
