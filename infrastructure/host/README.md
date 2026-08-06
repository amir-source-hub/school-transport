# Redis host memory-overcommit prerequisite

Redis background persistence and replication can fail when Linux refuses `fork()` despite available
memory. Every production container host must report `vm.overcommit_memory=1` before deployment. This
is a host-kernel control; it cannot be reliably or safely enabled from an unprivileged container.

Run the read-only check before image pulls, migrations, or service startup:

```sh
bash infrastructure/host/preflight.sh
```

A value other than `1`, an unavailable `/proc/sys`, or a non-Linux host is a deployment blocker.

## Persistent installation on a dedicated Linux host

Review all four policy files in this directory. Preview without changing the host:

```sh
bash infrastructure/host/install.sh --check
```

During an approved maintenance window, a host administrator may apply them explicitly:

```sh
sudo env CONFIRM_REDIS_OVERCOMMIT_INSTALL=INSTALL_VM_OVERCOMMIT_MEMORY_1 \
  bash infrastructure/host/install.sh --apply
```

The installer writes `vm.overcommit_memory = 1` to `/etc/sysctl.d`, installs the read-only preflight,
and installs a systemd unit plus Docker `Requires` drop-in. It then reloads sysctl/systemd and runs the
check. The hardened one-shot does not remain active, so Docker dependency starts re-run the live
kernel check. On future boots, `systemd-sysctl` applies the persistent value and Docker cannot start
when the preflight fails. Use this only on a dedicated deployment host whose Docker lifecycle is
managed by the service owner.

Verify after installation and after every kernel/host-image update:

```sh
sysctl vm.overcommit_memory
systemctl status school-transport-host-preflight.service
systemctl show docker.service -p Requires -p After
bash /usr/local/libexec/school-transport/host-preflight.sh
```

Capture the non-secret command results in deployment evidence. Host configuration management may
install equivalent files instead of this script, but it must preserve the persistent sysctl and the
fail-closed pre-start check. Container rollout must not attempt an ad hoc `sysctl -w` fallback.

Repository tests use an isolated fake `/proc/sys` tree and never change the host:

```sh
bash infrastructure/host/test-preflight.sh
```
