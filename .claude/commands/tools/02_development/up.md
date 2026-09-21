---
model: haiku
description: Start Development Environment
---

# /up - Start Development Environment

Start the complete local development environment including Supabase and Docker containers.

## Usage
```
/up
```

## Examples
```
/up
```

## Execution

When invoked with `/up`, execute these steps:

1. **Check Prerequisites**
   ```bash
   # Check for Supabase CLI
   command -v supabase
   # If not found: "❌ Supabase CLI not found! Install with: brew install supabase/tap/supabase"

   # Check Docker is running
   docker info
   # If not running: "❌ Docker is not running! Please start Docker Desktop."

   # Check for jq (recommended for reliable key parsing)
   command -v jq
   # If not found: "⚠️ jq not installed. Install with: brew install jq (recommended for reliability)"
   ```

2. **Begin Environment Setup**
   **Output:**
   ```
   🚀 Starting complete local development environment...

   Prerequisites:
   ✅ Supabase CLI
   ✅ Docker
   ✅ jq (or ⚠️ jq not found - will use fallback parsing)
   ```

   *Note: Context is automatically initialized by UserPromptSubmit hook*

3. **Start Supabase Services**
   ```bash
   # Check if Supabase is already running
   supabase status

   # If not running, start it
   supabase start
   ```
   **Output:**
   ```
   1️⃣ Starting Supabase...
   ✅ Supabase running
   ```

4. **Configure Environment**
   ```bash
   # Create .env.local with Supabase credentials
   # All URLs use localhost for consistency
   ./scripts/create-env-local.sh
   ```
   **Output:**
   ```
   2️⃣ Creating .env.local...
   ✅ Created .env.local with Supabase credentials
   ```

5. **Initialize Database**
   ```bash
   # Run migrations and seed data
   supabase db reset
   ```
   **Output:**
   ```
   3️⃣ Checking database migrations and seeding data...
   ✅ Database initialized with test data
   ```

6. **Start Application Containers**
   ```bash
   # Start Docker containers
   docker-compose -f docker-compose.local.yml --env-file .env.local up -d
   ```
   **Output:**
   ```
   4️⃣ Starting application containers...
   ```

7. **Health Check** (NEW)
   ```bash
   # Wait for services to be ready
   sleep 10

   # Check frontend is responding
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "Frontend not ready yet"

   # Check backend is responding
   curl -s http://localhost:8000/health || curl -s http://localhost:8000/docs | head -1

   # Check Supabase Studio is accessible
   curl -s -o /dev/null -w "%{http_code}" http://localhost:54323 || echo "Supabase Studio not ready"
   ```
   **Output:**
   ```
   5️⃣ Verifying services...
   ✅ Frontend:        http://localhost:3000
   ✅ Backend API:     http://localhost:8000
   ✅ Supabase Studio: http://localhost:54323
   ```

   If any service fails:
   ```
   ⚠️ Some services may still be starting. Check logs with: docker-compose logs -f
   ```

8. **Complete Setup**
   **Output:**
   ```
   ═══════════════════════════════════════════════════════
   ✅ Development environment ready!
   ═══════════════════════════════════════════════════════

   📍 Access Points:
      Frontend:        http://localhost:3000
      Backend API:     http://localhost:8000
      API Docs:        http://localhost:8000/docs
      Supabase Studio: http://localhost:54323
      Supabase API:    http://localhost:54321

   🔑 Test Credentials:
      Seeded User: seeded@test.dev / password123 (has sample data)
      Blank User:  blank@test.dev / password123 (empty state)

   📊 Seed Data (Seeded User):
      • 1 farm with 2 rows, 2 racks, 4 shelves
      • 3 plant species with seed varieties
      • 3 grow recipes
      • 3 grows (planned, active, harvested)
      • 3 device assignments

   ⚠️ Integrations (Not Configured):
      Home Assistant and Square integrations require
      additional configuration. See docs for setup.

   📝 Common Commands:
      View logs:       docker-compose -f docker-compose.local.yml logs -f
      Stop all:        /down
      Reset database:  supabase db reset
      Rebuild:         docker-compose -f docker-compose.local.yml up -d --build

   📚 New Developer?
      See: docs/guides/onboarding/junior-developer.md

   💡 Next step: '/dev {issue}' to start implementing a planned issue
   ═══════════════════════════════════════════════════════
   ```

   *Note: Environment configuration is saved by PostToolUse hook for subsequent runs*

## Troubleshooting

If the environment fails to start, check these common issues:

### Supabase won't start
```bash
# Check if ports are in use
lsof -i :54321 -i :54322 -i :54323

# Stop any existing Supabase instance
supabase stop

# Try starting again
supabase start
```

### Docker containers fail
```bash
# View container logs
docker-compose -f docker-compose.local.yml logs

# Rebuild containers
docker-compose -f docker-compose.local.yml up -d --build

# Check if ports are available
lsof -i :3000 -i :8000
```

### Database errors
```bash
# Reset database completely
supabase db reset

# Check migration status
supabase migration list
```

### Environment variables not loading
```bash
# Regenerate .env.local
rm .env.local
./scripts/create-env-local.sh

# Verify keys were extracted
cat .env.local | grep SUPABASE
```
