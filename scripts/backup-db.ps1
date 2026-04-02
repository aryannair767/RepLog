# scripts/backup-db.ps1
# Usage: .\scripts\backup-db.ps1

# Configuration
$TIMESTAMP = Get-Date -Format "yyyy-MM-dd_HH-mm"
$BACKUP_DIR = ".\backups"
$BACKUP_FILE = "$BACKUP_DIR\backup_$TIMESTAMP.sql"

# 1. Ensure backup directory exists
if (!(Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR
    Write-Host "Created backups directory." -ForegroundColor Green
}

# 2. Get connection string from .env.local
if (!(Test-Path ".env.local")) {
    Write-Error ".env.local not found in current directory."
    exit 1
}

$DIRECT_URL = (Get-Content .env.local | Select-String "DIRECT_URL=").Line.Split("=")[1]
if (!$DIRECT_URL) {
    Write-Error "DIRECT_URL not found in .env.local."
    exit 1
}

Write-Host "--- RepLog Database Snapshot ---" -ForegroundColor Blue
Write-Host "Target: $DIRECT_URL" -ForegroundColor Gray
Write-Host "Saving to: $BACKUP_FILE" -ForegroundColor Cyan

# 3. Execute pg_dump
# Note: This requires postgresql (psql/pg_dump) to be installed and in PATH.
try {
    & pg_dump "$DIRECT_URL" --file="$BACKUP_FILE" --no-owner --no-privileges
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Backup successful!" -ForegroundColor Green
    } else {
        Write-Error "❌ pg_dump failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Error "❌ Error running pg_dump. Is PostgreSQL installed and in your PATH?`n$($_.Exception.Message)"
}

Write-Host "--------------------------------" -ForegroundColor Blue
