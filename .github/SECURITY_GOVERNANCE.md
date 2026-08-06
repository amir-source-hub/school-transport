# Software supply-chain governance

The security workflow blocks verified leaked secrets, high or critical dependency findings,
high or critical filesystem/container findings, IaC misconfiguration, CodeQL findings, and newly
introduced `AGPL-3.0`, `GPL-3.0`, or `SSPL-1.0` dependencies. It also publishes a production-license
inventory and an SPDX JSON SBOM for review.

## Exceptions

Do not silence a scanner inline or weaken a repository-wide severity threshold. A temporary
exception must be a pull request that links to a tracked security issue and records:

- the finding identifier, affected package or file, and scanner;
- why remediation or replacement is not currently feasible;
- compensating controls and an accountable owner;
- an expiry date no more than 90 days away; and
- approval from a repository maintainer who did not author the exception.

Expired exceptions block the next change that touches the affected dependency or configuration.
Critical leaked credentials are never eligible for an exception: revoke and rotate them before
merging. License exceptions also require confirmation that distribution obligations are compatible
with the intended deployment model.

Dependabot opens bounded weekly update groups. Major updates remain separate so their migrations
and release notes receive explicit review.

## Response targets and releases

The repository maintainers own initial triage. Confirm critical findings within one business day
and high findings within three business days. Remediate exploitable critical findings within 48
hours and high findings within 14 days; otherwise use the time-bounded exception process above.
For an emergency release, freeze unrelated merges, rotate exposed credentials first, build from the
reviewed commit, run the security and deployment workflows, promote one digest-addressed artifact,
and record verification plus rollback evidence in the incident issue.

Every external GitHub Action reference is checked for a full 40-character commit pin. Release SBOMs
and license inventories are retained with the workflow run. Signed GitHub artifact provenance must
be enabled in the publishing workflow once the production registry and repository plan are selected;
until then, production artifact publication remains an explicit open governance control.
