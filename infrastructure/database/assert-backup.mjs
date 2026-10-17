import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = import.meta.dirname;
const read = (name) => readFile(resolve(directory, name), 'utf8');

const files = Object.fromEntries(
  await Promise.all(
    [
      'install-backup.sh',
      'install-restore-validator.sh',
      'install-retention-cleanup.sh',
      'run-backup.sh',
      'validate-remote-backup.sh',
      'cleanup-remote-backups.sh',
      'school-transport-backup.service',
      'school-transport-restore-validation.service',
      'school-transport-backup-retention.service',
      'school-transport-backup.timer',
      'school-transport-restore-validation.timer',
      'school-transport-backup-retention.timer',
      'backup.env.example',
      'restore-validation.env.example',
      'backup-retention.env.example',
    ].map(async (name) => [name, await read(name)]),
  ),
);

const requireText = (file, values) => {
  for (const value of values) {
    if (!files[file].includes(value)) throw new Error(`${file} is missing ${value}.`);
  }
};

requireText('install-backup.sh', [
  'run-backup.sh',
  'backup.env.example',
  'school-transport-backup.service',
  'school-transport-backup.timer',
  'install -d -o root -g root -m 0755 /etc/school-transport',
]);
requireText('install-restore-validator.sh', [
  'validate-remote-backup.sh',
  'restore-validation.env.example',
  'school-transport-restore-validation.service',
  'school-transport-restore-validation.timer',
  'install -d -o root -g school-transport-recovery -m 0750 /etc/school-transport/keys',
]);
requireText('install-retention-cleanup.sh', [
  'cleanup-remote-backups.sh',
  'backup-retention.env.example',
  'school-transport-backup-retention.service',
  'school-transport-backup-retention.timer',
  'install -d -o root -g root -m 0755 /etc/school-transport',
]);
requireText('run-backup.sh', [
  'set -Eeuo pipefail',
  'flock -n 9',
  'pg_dump',
  'age --encrypt',
  'sha256sum',
  'BACKUP_MINIMUM_BYTES',
  'put-object',
  'head-object',
  'manifest is the completion marker',
  'date -u +%d%H',
  'school_transport_backup_last_run_success',
]);
requireText('validate-remote-backup.sh', [
  'set -Eeuo pipefail',
  'sha256sum "$artifact"',
  'grep -Fq "\\"sha256\\":',
  '--network none',
  '--read-only',
  '--tmpfs /var/lib/postgresql/data:',
  'pg_restore',
  '--exit-on-error',
  'latestMigration',
  'invalid_constraints',
  'invalid_payment_plans',
  'school_transport_restore_validation_last_run_success',
]);
requireText('cleanup-remote-backups.sh', [
  '--dry-run',
  'DELETE_EXPIRED_LOCKED_BACKUPS',
  'newest_good',
  'list-object-versions',
  '--version-id',
  'school_transport_backup_retention_last_run_success',
]);

for (const file of [
  'school-transport-backup.service',
  'school-transport-restore-validation.service',
  'school-transport-backup-retention.service',
]) {
  requireText(file, [
    'Type=oneshot',
    'NoNewPrivileges=yes',
    'PrivateTmp=yes',
    'ProtectSystem=strict',
    'ProtectHome=yes',
    'UMask=0077',
  ]);
}
for (const file of [
  'school-transport-backup.timer',
  'school-transport-restore-validation.timer',
  'school-transport-backup-retention.timer',
]) {
  requireText(file, ['OnCalendar=', ' UTC', 'Persistent=true', 'RandomizedDelaySec=']);
}
for (const file of [
  'backup.env.example',
  'restore-validation.env.example',
  'backup-retention.env.example',
]) {
  requireText(file, ['AWS_ACCESS_KEY_ID=', 'AWS_SECRET_ACCESS_KEY=', 'BACKUP_REMOTE_BUCKET=']);
}

process.stdout.write(
  'Backup assets cover encrypted creation, remote verification, isolated restore, retention, scheduling, and installer safety.\n',
);
