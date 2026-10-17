# Alert delivery

Owner: platform on-call. Escalate a confirmed notification outage immediately through the approved
out-of-band contact tree.

1. Check the Prometheus `alertmanager` target, `prometheus_notifications_alertmanagers_discovered`,
   Alertmanager health, and active alerts. Separate rule evaluation failure from delivery failure.
2. Inspect Alertmanager logs for status codes and error classes without printing the bot token or
   request payload. Confirm DNS and outbound HTTPS connectivity to `tapi.bale.ai` from the
   `probe_egress` network.
3. Verify the protected monitoring environment has mode `0600`, contains a non-empty Bale token and
   numeric chat ID, and is readable by the Compose operator. Confirm the bot remains a member of the
   destination. Never paste either value into an incident ticket or command line.
4. For rate limiting, preserve the configured grouping and repeat intervals. Do not disable alert
   grouping or create retry loops that amplify provider throttling.
5. Use the approved out-of-band contact tree while delivery is impaired. Do not rely on the same
   Bale for the outage notification.
6. After recovery, send a synthetic warning and critical alert, confirm receipt and resolution, and
   record delivery latency. Close only after notification failures remain at zero for 30 minutes.
