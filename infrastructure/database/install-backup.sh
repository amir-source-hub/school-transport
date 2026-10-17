#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
mode="${1:---check}"

[[ "$(uname -s)" == Linux ]] || {
  printf 'error: backup installation is supported only on the Linux production host\n' >&2
  exit 2
}
if [[ "$mode" == --check ]]; then
  printf '%s\n' \
    'dry run: installs the backup runner, systemd service/timer, documentation, service account,' \
    'and restricted local directories; it does not create credentials or enable the timer.'
  exit 0
fi
[[ "$mode" == --apply ]] || { printf 'error: usage: install-backup.sh [--check|--apply]\n' >&2; exit 2; }
[[ "${CONFIRM_BACKUP_INSTALL:-}" == INSTALL_SCHOOL_TRANSPORT_BACKUP ]] || {
  printf 'error: set CONFIRM_BACKUP_INSTALL=INSTALL_SCHOOL_TRANSPORT_BACKUP\n' >&2
  exit 2
}
[[ "${EUID:-$(id -u)}" == 0 ]] || { printf 'error: --apply must run as root\n' >&2; exit 2; }

getent group school-transport-backup >/dev/null || groupadd --system school-transport-backup
getent group school-transport-metrics >/dev/null || groupadd --system school-transport-metrics
id school-transport-backup >/dev/null 2>&1 || useradd --system --gid school-transport-backup \
  --home-dir /var/lib/school-transport/backups --shell /usr/sbin/nologin school-transport-backup
getent group docker >/dev/null || { printf 'error: docker group does not exist\n' >&2; exit 2; }
usermod --append --groups docker school-transport-backup
usermod --append --groups school-transport-metrics school-transport-backup
install -d -o school-transport-backup -g school-transport-backup -m 0700 /var/lib/school-transport/backups
install -d -o root -g school-transport-metrics -m 0770 /var/lib/node_exporter/textfile_collector
install -d -o root -g root -m 0755 /etc/school-transport
install -D -o root -g root -m 0755 "$script_dir/run-backup.sh" /usr/local/libexec/school-transport/run-backup.sh
install -D -o root -g root -m 0755 "$script_dir/backup.sh" /usr/local/libexec/school-transport/backup.sh
install -D -o root -g root -m 0755 "$script_dir/lib.sh" /usr/local/libexec/school-transport/lib.sh
install -D -o root -g root -m 0644 "$script_dir/README.md" /usr/local/share/doc/school-transport/database-backup.md
install -D -o root -g root -m 0644 "$script_dir/school-transport-backup.service" /etc/systemd/system/school-transport-backup.service
install -D -o root -g root -m 0644 "$script_dir/school-transport-backup.timer" /etc/systemd/system/school-transport-backup.timer
if [[ ! -f /etc/school-transport/backup.env ]]; then
  install -o root -g school-transport-backup -m 0640 "$script_dir/backup.env.example" /etc/school-transport/backup.env
  printf 'created placeholder backup.env; replace every placeholder before enabling\n'
fi
systemctl daemon-reload
printf '%s\n' 'backup files installed; manually validate one backup before enabling the timer'
