# Backup and recovery alert runbook

Owner: platform on-call. Escalation: database recovery owner, security lead for suspected deletion
or credential compromise, and incident commander when the approved RPO or RTO is at risk.

## Initial checks

1. Record the alert start in UTC, environment, host, release ID, last successful backup timestamp,
   and last successful restore-validation timestamp. Do not copy credentials, database URLs, signed
   URLs, or personal data into the incident record.
2. Confirm that the Dockerized Node Exporter target is up and its read-only textfile mount contains
   the backup and restore-validation metric files. Distinguish missing collection from a confirmed
   backup failure.
3. Inspect the backup or restore-validation service status and sanitized logs. Check host disk,
   PostgreSQL readiness, Docker availability, remote bucket reachability, credential validity, and
   encryption-key availability as applicable.
   For retention alerts, inspect `school-transport-backup-retention.service`, confirm Object Lock
   expiry, version-delete permissions, and the reviewed dry-run output before retrying.
4. With the appropriate least-privilege identity, confirm the newest remote artifact, checksum,
   manifest, object size, checksum metadata, versioning, and retention state. Do not download data
   to an uncontrolled workstation.

## Containment and recovery

- Do not delete or overwrite local or remote backup evidence.
- Do not disable immutability, shorten retention, or grant delete access to the backup identity.
- Do not restore over production. Restore into a new isolated database or cluster with provider
  egress disabled.
- For a transient backup failure, correct capacity, connectivity, or credentials and run one
  controlled backup. Confirm remote verification and fresh metrics.
- For a restore-validation failure, preserve the failed artifact and logs, select the newest earlier
  immutable backup, and repeat validation. Escalate immediately if no backup meets the approved RPO.
- For suspected credential misuse or object deletion, revoke affected credentials, preserve access
  logs, use the separately controlled recovery identity, and activate the security incident process.

## Closure

Close a backup alert only after a new artifact is encrypted, uploaded, remotely verified, and
visible in metrics. Restore alerts additionally require a successful isolated restore from remote
storage, schema and migration validation, representative read checks, and a duration within RTO.
Record the object version, measured RPO/RTO, cause, corrective owner, and due date.
