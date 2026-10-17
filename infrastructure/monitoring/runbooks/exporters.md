# Exporter alerts

Owner: platform on-call.

1. Confirm the exporter container is running and its Prometheus target is `up`. Treat an exporter failure separately from failure of the monitored dependency.
2. For host disk or memory pressure, identify the consuming filesystem, process, or container. Preserve database, backup, and audit data; do not delete operational evidence to clear an alert.
3. For `NodeTextfileCollectorError`, inspect only filenames and parser errors under `/var/lib/node_exporter/textfile_collector`. Metric files must be atomically replaced and contain no secrets or personal data.
4. For PostgreSQL or Redis connectivity, verify the dependency health first, then network membership, the monitoring credential, and its minimum permissions. Never print secret file contents.
5. For failed black-box probes, compare the public probe with the internal API health probe. Check DNS, certificate validity, reverse proxy, application health, and upstream reachability.
6. Close the incident only after the target and dependency metrics remain healthy for 15 minutes. Record the cause, impact, owner, and corrective action.

cAdvisor is intentionally privileged and can inspect host container state. Access to its container, mounts, and network must be restricted to host administrators; its port must never be published.
