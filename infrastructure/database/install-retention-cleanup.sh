#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
mode="${1:---check}"
[[ "$(uname -s)" == Linux ]] || { printf 'error: retention cleanup requires Linux\n' >&2; exit 2; }
if [[ "$mode" == --check ]]; then
  printf '%s\n' 'dry run: installs the separate backup-retention identity and daily timer; it does not create credentials or enable the timer'
  exit 0
fi
[[ "$mode" == --apply ]] || { printf 'error: usage: install-retention-cleanup.sh [--check|--apply]\n' >&2; exit 2; }
[[ "${CONFIRM_RETENTION_INSTALL:-}" == INSTALL_SCHOOL_TRANSPORT_RETENTION ]] || {
  printf 'error: set CONFIRM_RETENTION_INSTALL=INSTALL_SCHOOL_TRANSPORT_RETENTION\n' >&2
  exit 2
}
[[ "${EUID:-$(id -u)}" == 0 ]] || { printf 'error: --apply must run as root\n' >&2; exit 2; }

getent group school-transport-retention >/dev/null || groupadd --system school-transport-retention
getent group school-transport-metrics >/dev/null || groupadd --system school-transport-metrics
id school-transport-retention >/dev/null 2>&1 || useradd --system --gid school-transport-retention \
  --home-dir /var/lib/school-transport/backup-retention --shell /usr/sbin/nologin school-transport-retention
usermod --append --groups school-transport-metrics school-transport-retention
install -d -o school-transport-retention -g school-transport-retention -m 0700 /var/lib/school-transport/backup-retention
install -d -o root -g school-transport-metrics -m 0770 /var/lib/node_exporter/textfile_collector
install -d -o root -g root -m 0755 /etc/school-transport
install -D -o root -g root -m 0755 "$script_dir/cleanup-remote-backups.sh" /usr/local/libexec/school-transport/cleanup-remote-backups.sh
install -D -o root -g root -m 0755 "$script_dir/lib.sh" /usr/local/libexec/school-transport/lib.sh
install -D -o root -g root -m 0644 "$script_dir/README.md" /usr/local/share/doc/school-transport/database-backup.md
install -D -o root -g root -m 0644 "$script_dir/school-transport-backup-retention.service" /etc/systemd/system/school-transport-backup-retention.service
install -D -o root -g root -m 0644 "$script_dir/school-transport-backup-retention.timer" /etc/systemd/system/school-transport-backup-retention.timer
if [[ ! -f /etc/school-transport/backup-retention.env ]]; then
  install -o root -g school-transport-retention -m 0640 "$script_dir/backup-retention.env.example" /etc/school-transport/backup-retention.env
fi
systemctl daemon-reload
printf '%s\n' 'retention cleanup installed but disabled; configure credentials and complete a reviewed dry run first'
