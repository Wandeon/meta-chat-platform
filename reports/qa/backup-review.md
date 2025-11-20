# Backup and Recovery Review

## Findings

- **Backup strategy**: The repository includes a comprehensive PostgreSQL backup script (`scripts/backup-database.sh`) with on-host retention, optional S3 uploads, verification, and notification hooks. It documents a cron entry for daily execution at 2 AM but there is no evidence in-repo that the job is installed on VPS-00 or that backups have been recently produced. 【F:scripts/backup-database.sh†L1-L200】【F:scripts/backup-database.sh†L248-L301】
- **Backup scripts**: The primary backup script and supporting verification tooling exist. The backup script supports creation, verification, and cleanup with default 30-day retention and optional S3 cleanup; a dedicated validator (`scripts/backup/verify_backups.sh`) checks PostgreSQL and Redis artifacts but relies on external tools (`pg_verifybackup`, `redis-check-*`, `python3`). No automated test evidence is present in the repo. 【F:scripts/backup-database.sh†L202-L301】【F:scripts/backup/verify_backups.sh†L1-L185】
- **Recovery documentation**: Current operations runbook documents manual backup, restore, and scheduling steps, including commands for creating and restoring database backups via Docker/pg_restore. A weekly verification checklist is provided, but the runbook does not record actual restore tests or outcomes. 【F:docs/current/operations/maintenance.md†L132-L360】
- **Data retention**: The backup script enforces a configurable retention window (default 30 days) for both local and S3 copies; the operations runbook mirrors a 30-day cleanup expectation. No longer-term archival or legal hold policy is described. 【F:scripts/backup-database.sh†L202-L236】【F:docs/current/operations/maintenance.md†L311-L328】
- **Cron/automation visibility**: Logrotate includes backup and cron log handling, but there is no checked-in crontab or infrastructure-as-code confirming that scheduled backups are active on VPS-00. Verification would require inspecting the server’s crontab and backup log paths (`/var/log/metachat/backup.log`, `/var/log/metachat/cron.log`). 【F:infrastructure/logrotate/metachat†L20-L45】【F:docs/current/operations/monitoring.md†L129-L138】

## Answers to Questions

- **Are backups happening?** Repository materials show how backups *should* run, but there is no evidence of recent executions or active cron setup. Server-side verification of cron entries and `/var/log/metachat/backup.log` is needed.
- **Can you restore from backup?** Restore procedures are documented (drop/recreate DB and `pg_restore` from compressed dumps). However, there is no recorded proof of a successful test restore; validation depends on actually exercising the steps against available artifacts. 【F:docs/current/operations/maintenance.md†L344-L363】
- **Is there a disaster recovery plan?** A full DR plan is not present. There are backup/restore instructions and verification scripts, but no documented RTO/RPO targets, failover steps, or environment rebuild process beyond database restoration.
- **Data retention policies?** Backups default to 30-day retention locally (and on S3 if configured). No evidence of longer-term archival or compliance-driven retention requirements. 【F:scripts/backup-database.sh†L202-L236】【F:docs/current/operations/maintenance.md†L311-L328】

## Recommendations

1. Confirm on VPS-00 that the 2 AM backup cron job is installed and that `/var/log/metachat/backup.log` shows recent runs; add cron configuration to version control for visibility.
2. Run a full backup-and-restore test (ideally in staging) using `scripts/backup-database.sh` and the documented restore steps, capturing results in the runbook.
3. Automate `scripts/backup/verify_backups.sh` in cron or CI with alerting, ensuring required utilities (`pg_verifybackup`, `redis-check-*`, `python3`) are installed.
4. Define and document a disaster recovery plan with RPO/RTO targets, restore priorities (DB, Redis, file storage), and infrastructure rebuild steps; include evidence of periodic DR drills.
5. Clarify retention/archival requirements beyond the default 30-day window and document any offsite/immutable storage expectations.
