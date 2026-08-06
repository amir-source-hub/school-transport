#!/usr/bin/env bash
set -Eeuo pipefail

proc_sys_root="${PROC_SYS_ROOT:-/proc/sys}"
if [[ "$proc_sys_root" != /proc/sys && "${PREFLIGHT_TEST_MODE:-}" != 1 ]]; then
  printf 'error: PROC_SYS_ROOT override is allowed only with PREFLIGHT_TEST_MODE=1\n' >&2
  exit 2
fi

setting="$proc_sys_root/vm/overcommit_memory"
if [[ ! -r "$setting" ]]; then
  printf 'error: cannot read %s; run this preflight on the Linux container host\n' "$setting" >&2
  exit 2
fi

value="$(tr -d '[:space:]' <"$setting")"
if [[ "$value" != 1 ]]; then
  printf '%s\n' \
    "error: Redis host prerequisite failed: vm.overcommit_memory is '$value', expected '1'." \
    'Install the reviewed infrastructure/host/99-school-transport-redis.conf through' \
    'infrastructure/host/install.sh --apply, or have the host administrator set the' \
    'equivalent persistent sysctl policy. Re-run this preflight before deployment.' >&2
  exit 1
fi

printf 'host preflight passed: vm.overcommit_memory=1\n'
