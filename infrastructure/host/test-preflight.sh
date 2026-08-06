#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
fixture="$(mktemp -d "${TMPDIR:-/tmp}/school-transport-host-test.XXXXXX")"
trap 'rm -rf -- "$fixture"' EXIT
mkdir -p "$fixture/vm"

run_fixture() {
  PREFLIGHT_TEST_MODE=1 PROC_SYS_ROOT="$fixture" bash "$script_dir/preflight.sh" 2>&1
}

printf '1\n' >"$fixture/vm/overcommit_memory"
[[ "$(run_fixture)" == 'host preflight passed: vm.overcommit_memory=1' ]]

for invalid in 0 2 invalid; do
  printf '%s\n' "$invalid" >"$fixture/vm/overcommit_memory"
  if output="$(run_fixture)"; then
    printf 'expected preflight failure for value %s\n' "$invalid" >&2
    exit 1
  fi
  [[ "$output" == *"expected '1'"* ]]
done

rm -f "$fixture/vm/overcommit_memory"
if output="$(run_fixture)"; then
  printf 'expected preflight failure for a missing kernel setting\n' >&2
  exit 1
fi
[[ "$output" == *'cannot read'* ]]

if PROC_SYS_ROOT="$fixture" bash "$script_dir/preflight.sh" >/dev/null 2>&1; then
  printf 'expected an unguarded PROC_SYS_ROOT override to fail\n' >&2
  exit 1
fi

grep -Eq '^vm\.overcommit_memory[[:space:]]*=[[:space:]]*1$' \
  "$script_dir/99-school-transport-redis.conf"
grep -Fq 'Requires=school-transport-host-preflight.service' "$script_dir/docker-preflight.conf"
grep -Fq 'Before=docker.service' "$script_dir/school-transport-host-preflight.service"
grep -Fq 'CONFIRM_REDIS_OVERCOMMIT_INSTALL' "$script_dir/install.sh"
if grep -Eq 'sysctl[[:space:]]+-w' "$script_dir"/*.sh; then
  printf 'runtime-only sysctl mutation is forbidden; install a persistent policy instead\n' >&2
  exit 1
fi

printf 'host preflight tests passed\n'
