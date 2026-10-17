# Alert delivery

Owner: platform on-call. Escalate a confirmed notification outage immediately through the approved
out-of-band contact tree.

1. Check the Prometheus `alertmanager` target, `prometheus_notifications_alertmanagers_discovered`,
   Alertmanager health, and active alerts. Separate rule evaluation failure from delivery failure.
2. Inspect Alertmanager logs for status codes and error classes without printing the webhook URL or
   request payload. Confirm DNS and outbound connectivity from the `probe_egress` network.
3. Verify the protected webhook URL file exists, is readable by the container, contains one URL with
   no trailing whitespace, and has not expired or been revoked. Never paste it into an incident
   ticket or command line.
4. For rate limiting, preserve the configured grouping and repeat intervals. Do not disable alert
   grouping or create retry loops that amplify provider throttling.
5. Use the approved out-of-band contact tree while delivery is impaired. Do not rely on the same
   webhook provider for the outage notification.
6. After recovery, send a synthetic warning and critical alert, confirm receipt and resolution, and
   record delivery latency. Close only after notification failures remain at zero for 30 minutes.
