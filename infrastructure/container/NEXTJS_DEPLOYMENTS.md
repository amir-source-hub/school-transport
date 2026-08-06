# Next.js release consistency

Build each production web image once and promote it unchanged to every replica. Set
`NEXT_DEPLOYMENT_ID` to an immutable release or commit identifier. Keep
`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` in the deployment secret store, share it across replicas, and
rotate it deliberately rather than generating a value per replica.

The build consumes the encryption key as a BuildKit secret. Next.js uses the deployment ID to
detect version skew and hard-reload stale clients before client navigation continues.

For a release or rollback:

1. Build one digest-addressed web image with the target deployment ID.
2. Verify every candidate replica uses the same image digest before routing traffic to it.
3. Replace replicas from that image; never rebuild independently on individual hosts.
4. Keep the previous image for rollback and roll back by digest.
5. Monitor `Failed to find Server Action`. Sustained errors indicate mixed images or an incorrectly
   rotated key; isolated invalid posts may be old tabs or probes.

Do not retry an unknown Server Action POST at the proxy because actions can mutate state. The
deployment-ID protocol provides safe browser recovery through a hard navigation; malformed direct
probes remain rejected by Next.js.
