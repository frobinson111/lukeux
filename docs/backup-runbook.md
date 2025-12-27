# MongoDB Atlas Backup & Restore Runbook (PITR)

## Enable Backups & PITR
1. In Atlas, open the project/cluster (Cluster2).
2. Ensure the cluster tier supports backups/PITR (M10+).
3. Go to **Backups** (or **Backup & Restore**) and enable **Continuous** backups with **Point-in-Time Recovery (PITR)**.
4. Set a retention window (e.g., 7–14 days) based on compliance/cost needs.
5. Confirm daily snapshots are enabled; PITR will fill the gaps.

## Validate Backups
1. In Atlas, check the **Snapshots** tab to confirm recent snapshots exist.
2. Check **Restore History** to verify PITR is available.

## Restore Procedure (PITR)
1. In Atlas, go to **Backups** → **Restore**.
2. Choose **Point in time** restore and pick the timestamp within the retention window.
3. Restore to a **new cluster** (recommended) to avoid overwriting prod.
4. Once restored, update application `MONGODB_URI` to point to the restored cluster if performing a failover; otherwise, export data and selectively copy collections.

## Restore Procedure (Snapshot)
1. In Atlas, go to **Backups** → **Restore**.
2. Choose the snapshot and restore to a **new cluster**.
3. Validate data, then cut over by updating `MONGODB_URI` or migrating data.

## Testing Backups
1. At least quarterly, perform a test restore to a new cluster.
2. Run smoke tests against the restored data (auth, critical queries).
3. Document the outcome and time-to-restore.

## Env Vars (App)
- `MONGODB_URI` should point to the primary cluster.
- Keep credentials in Atlas/Env managers (Vercel/Railway), not in code.

