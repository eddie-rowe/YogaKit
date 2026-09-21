---
model: haiku
description: Stop Development Environment
---

# /down - Stop Development Environment

Stop the local development environment, pull latest main, and reset for the next issue.

## Usage
```
/down [options]
```

## Options
- `--keep-supabase` - Only stop Docker containers, keep Supabase running
- `--keep-branch` - Don't checkout main (stay on current branch)
- `--volumes` - Remove Docker volumes (clean slate for next `/up`)

## Examples
```
/down                  # Stop everything, checkout main, pull latest
/down --keep-supabase  # Keep Supabase for faster restart
/down --keep-branch    # Stay on current branch (don't reset to main)
/down --volumes        # Full cleanup including volumes
```

## Execution

When invoked with `/down`, execute these steps:

1. **Parse Options**
   ```
   # Check for flags
   --keep-supabase: Skip Supabase shutdown
   --keep-branch: Skip git checkout main
   --volumes: Add -v flag to docker-compose down
   ```

2. **Begin Shutdown**
   **Output:**
   ```
   🛑 Stopping development environment...
   ```

3. **Stop Application Containers**
   ```bash
   # Stop Docker containers
   docker-compose -f docker-compose.local.yml down

   # If --volumes flag provided:
   docker-compose -f docker-compose.local.yml down -v
   ```
   **Output:**
   ```
   1️⃣ Stopping application containers...
   ✅ Docker containers stopped
   ```

4. **Stop Supabase** (unless `--keep-supabase`)
   ```bash
   supabase stop
   ```
   **Output:**
   ```
   2️⃣ Stopping Supabase...
   ✅ Supabase stopped
   ```

   If `--keep-supabase` flag:
   ```
   2️⃣ Keeping Supabase running (--keep-supabase)
   ```

5. **Reset to Main Branch** (unless `--keep-branch`)
   ```bash
   # Stash any uncommitted changes (just in case)
   git stash --include-untracked 2>/dev/null || true

   # Checkout main branch
   git checkout main

   # Pull latest changes
   git pull origin main

   # Clean up stale branches (optional)
   git fetch --prune
   ```
   **Output:**
   ```
   3️⃣ Resetting to main branch...
   ✅ Checked out main
   ✅ Pulled latest changes
   ```

   If `--keep-branch` flag:
   ```
   3️⃣ Keeping current branch (--keep-branch)
   ```

6. **Verify Cleanup**
   ```bash
   # Check no containers running
   docker ps --filter "name=vertical-farm" --format "{{.Names}}"

   # Check Supabase status (if stopped)
   supabase status 2>/dev/null || echo "Supabase not running"
   ```
   **Output:**
   ```
   4️⃣ Verifying cleanup...
   ✅ All services stopped
   ```

7. **Complete Shutdown**
   **Output:**
   ```
   ═══════════════════════════════════════════════════════
   ✅ Development environment stopped and reset!
   ═══════════════════════════════════════════════════════

   📊 Summary:
      Docker containers: Stopped
      Supabase:          Stopped (or "Running" if --keep-supabase)
      Volumes:           Preserved (or "Removed" if --volumes)
      Git branch:        main (latest)

   🎯 Ready for next issue!

   💡 Next step: '/up' then '/dev {issue}' to start the next issue
   ═══════════════════════════════════════════════════════
   ```

## Troubleshooting

### Containers won't stop
```bash
# Force stop all containers
docker-compose -f docker-compose.local.yml down --remove-orphans

# If still stuck, force kill
docker kill $(docker ps -q --filter "name=vertical-farm")
```

### Supabase won't stop
```bash
# Check what's running
supabase status

# Force stop
supabase stop --no-backup

# If ports still bound
lsof -i :54321 -i :54322 -i :54323
kill -9 <PID>
```

### Ports still in use after shutdown
```bash
# Find processes using ports
lsof -i :3000 -i :8000 -i :54321

# Kill specific process
kill -9 <PID>
```

### Clean slate (nuclear option)
```bash
# Stop everything and remove all data
/down --volumes
supabase stop --no-backup
docker system prune -f
```
