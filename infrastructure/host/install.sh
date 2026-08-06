#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
mode="${1:---check}"

[[ "$(uname -s)" == Linux ]] || {
  printf 'error: this installer is only for a dedicated Linux deployment host\n' >&2
  exit 2
}

if [[ "$mode" == --check ]]; then
  printf '%s\n' \
    'dry run: the installer would place the reviewed sysctl policy, host preflight,' \
    'systemd unit, and Docker Requires drop-in, then reload sysctl/systemd.' \
    'No host state was changed. Use --apply with the documented confirmation token.'
  exit 0
fi

[[ "$mode" == --apply ]] || {
  printf 'error: usage: install.sh [--check|--apply]\n' >&2
  exit 2
}
[[ "${CONFIRM_REDIS_OVERCOMMIT_INSTALL:-}" == INSTALL_VM_OVERCOMMIT_MEMORY_1 ]] || {
  printf 'error: set CONFIRM_REDIS_OVERCOMMIT_INSTALL=INSTALL_VM_OVERCOMMIT_MEMORY_1\n' >&2
  exit 2
}
[[ "${EUID:-$(id -u)}" == 0 ]] || {
  printf 'error: --apply must run as root on the dedicated deployment host\n' >&2
  exit 2
}

install -D -m 0644 "$script_dir/99-school-transport-redis.conf" \
  /etc/sysctl.d/99-school-transport-redis.conf
install -D -m 0755 "$script_dir/preflight.sh" \
  /usr/local/libexec/school-transport/host-preflight.sh
install -D -m 0644 "$script_dir/README.md" \
  /usr/local/share/doc/school-transport/host-preflight.md
install -D -m 0644 "$script_dir/school-transport-host-preflight.service" \
  /etc/systemd/system/school-transport-host-preflight.service
install -D -m 0644 "$script_dir/docker-preflight.conf" \
  /etc/systemd/system/docker.service.d/20-school-transport-host-preflight.conf

sysctl --system
systemctl daemon-reload
systemctl enable school-transport-host-preflight.service
systemctl start school-transport-host-preflight.service

printf 'installed persistent Redis overcommit policy and Docker host preflight\n'
