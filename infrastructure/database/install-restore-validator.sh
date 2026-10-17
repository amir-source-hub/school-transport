#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
mode="${1:---check}"
[[ "$(uname -s)" == Linux ]] || { printf 'error: restore validator requires Linux\n' >&2; exit 2; }
if [[ "$mode" == --check ]]; then
  printf '%s\n' 'dry run: installs the isolated weekly restore validator; it does not install a private key or enable the timer'
  exit 0
fi
[[ "$mode" == --apply ]] || { printf 'error: usage: install-restore-validator.sh [--check|--apply]\n' >&2; exit 2; }
[[ "${CONFIRM_RESTORE_VALIDATOR_INSTALL:-}" == INSTALL_SCHOOL_TRANSPORT_RESTORE_VALIDATOR ]] || {
  printf 'error: set CONFIRM_RESTORE_VALIDATOR_INSTALL=INSTALL_SCHOOL_TRANSPORT_RESTORE_VALIDATOR\n' >&2
  exit 2
}
[[ "${EUID:-$(id -u)}" == 0 ]] || { printf 'error: --apply must run as root\n' >&2; exit 2; }
getent group docker >/dev/null || { printf 'error: docker group does not exist\n' >&2; exit 2; }
getent group school-transport-recovery >/dev/null || groupadd --system school-transport-recovery
getent group school-transport-metrics >/dev/null || groupadd --system school-transport-metrics
id school-transport-recovery >/dev/null 2>&1 || useradd --system --gid school-transport-recovery \
  --home-dir /var/lib/school-transport/restore-validation --shell /usr/sbin/nologin school-transport-recovery
usermod --append --groups docker school-transport-recovery
usermod --append --groups school-transport-metrics school-transport-recovery
install -d -o school-transport-recovery -g school-transport-recovery -m 0700 /var/lib/school-transport/restore-validation
install -d -o root -g school-transport-metrics -m 0770 /var/lib/node_exporter/textfile_collector
install -d -o root -g root -m 0755 /etc/school-transport
install -d -o root -g school-transport-recovery -m 0750 /etc/school-transport/keys
install -D -o root -g root -m 0755 "$script_dir/validate-remote-backup.sh" /usr/local/libexec/school-transport/validate-remote-backup.sh
install -D -o root -g root -m 0755 "$script_dir/lib.sh" /usr/local/libexec/school-transport/lib.sh
install -D -o root -g root -m 0644 "$script_dir/README.md" /usr/local/share/doc/school-transport/database-backup.md
install -D -o root -g root -m 0644 "$script_dir/school-transport-restore-validation.service" /etc/systemd/system/school-transport-restore-validation.service
install -D -o root -g root -m 0644 "$script_dir/school-transport-restore-validation.timer" /etc/systemd/system/school-transport-restore-validation.timer
if [[ ! -f /etc/school-transport/restore-validation.env ]]; then
  install -o root -g school-transport-recovery -m 0640 "$script_dir/restore-validation.env.example" /etc/school-transport/restore-validation.env
fi
systemctl daemon-reload
printf '%s\n' 'restore validator installed but disabled; install the private age identity and run one manual validation first'
