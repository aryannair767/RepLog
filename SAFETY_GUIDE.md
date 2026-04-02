# 🛡️ RepLog — Database Safety & Engineering Guide

This guide explains how to manage your Supabase database safely and prevent accidental data loss.

## 1. Environment Isolation (CRITICAL)

Never use your **Production** Database URL for local experiments, tutorials, or testing.

*   **Local Development**: Run `supabase start` to launch a local Supabase stack in Docker. Your local URL will be `postgresql://postgres:postgres@localhost:54322/postgres`.
*   **Production**: Only use your `DATABASE_URL` (ending in `pooler.supabase.com`) in your `.env.production` or when deploying.

> [!CAUTION]
> **Avoid `db reset` on Prod**: The command `supabase db reset` should **only** be run against your local database. Running it against a remote database will wipe all history.

---

## 2. Before Making Changes (The 3-Step Rule)

Before you run a new migration, a "restore" script, or a tutorial command:

1.  **Run the Backup Script**:
    ```powershell
    .\scripts\backup-db.ps1
    ```
    This creates a dated snapshot in the `backups/` folder.
2.  **Verify the `.env.local`**:
    Double-check that your `DATABASE_URL` is pointing to the correct project.
3.  **Use `prisma migrate dev`**:
    Always use Prisma to manage your schema. Avoid running raw `psql -f schema.sql` unless you are doing a full project migration.

---

## 3. Disaster Recovery

If you ever accidentally wipe your database again:

1.  Go to the `backups/` folder.
2.  Find the most recent `.sql` file.
3.  Restore it using `psql`:
    ```powershell
    psql -f backups/backup_YYYY-MM-DD_HH-mm.sql "[YOUR_CONNECTION_STRING]"
    ```
