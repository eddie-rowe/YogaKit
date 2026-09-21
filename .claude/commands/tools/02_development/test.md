---
model: haiku
description: Run Local CI with nektos/act
---

# /test - Run Local CI with nektos/act

Run GitHub Actions workflows locally using nektos/act to ensure 1:1 parity between local testing and CI/CD pipeline.

## Usage
```
/test
/test --quick
/test --security
```

## Examples
```
/test              # Run full CI (tests + security scans)
/test --quick      # Run only unit tests (faster)
/test --security   # Run only security scans
```

## Execution

When invoked with `/test`, execute these steps:

1. **Check Prerequisites**
   ```bash
   # Check for nektos/act
   command -v act
   # If not found: "act not found! Install with: brew install act"

   # Check Docker is running
   docker info
   # If not running: "Docker is not running! Please start Docker Desktop."

   # Check Supabase is running (for test database)
   supabase status
   # If not running: "Supabase not running. Tests may fail without database."

   # Ensure .act directories exist for artifacts and cache
   mkdir -p .act/artifacts .act/cache
   ```

2. **Begin Local CI**
   **Output:**
   ```
   Running local CI with nektos/act...
   This mirrors the GitHub Actions pipeline for 1:1 parity.

   Prerequisites:
   - act CLI
   - Docker
   - Supabase (or tests that skip DB if needed)

   Local storage:
   - Artifacts: .act/artifacts/
   - Cache: .act/cache/
   ```

   *Note: Context is automatically initialized by UserPromptSubmit hook*

3. **Prepare Secrets**
   ```bash
   # Generate act secrets from Supabase status if .act-secrets doesn't exist
   if [ ! -f .act-secrets ]; then
     ./scripts/create-act-secrets.sh
   fi
   ```
   **Output:**
   ```
   Preparing CI secrets...
   - Created .act-secrets from Supabase credentials
   ```

4. **Run Backend Tests**
   ```bash
   # Run backend test workflow (mirrors test-backend.yml)
   # Note: .actrc contains artifact-server-path and cache-server-path
   act -j backend-tests -W .github/workflows/main-pipeline.yml
   ```
   **Output:**
   ```
   Phase 1: Backend Tests (mirrors test-backend.yml)
   =====================================================
   [test-matrix/unit]        Running Python unit tests...
   [test-matrix/api]         Running API tests...
   [test-matrix/integration] Running integration tests...
   [test-matrix/schemas]     Running schema tests...

   Backend tests: PASSED/FAILED
   ```

5. **Run Frontend Tests**
   ```bash
   # Run frontend test workflow (mirrors test-frontend.yml)
   act -j frontend-tests -W .github/workflows/main-pipeline.yml
   ```
   **Output:**
   ```
   Phase 1: Frontend Tests (mirrors test-frontend.yml)
   =====================================================
   [test-matrix/unit]        Running Jest unit tests...
   [test-matrix/integration] Running integration tests...

   Frontend tests: PASSED/FAILED
   ```

6. **Run Security Scans** (skip with `--quick`)
   ```bash
   # Run security scan workflows (mirrors security-scan-*.yml)
   act -j backend-security -W .github/workflows/main-pipeline.yml
   act -j frontend-security -W .github/workflows/main-pipeline.yml
   ```
   **Output:**
   ```
   Phase 1: Security Scans
   =====================================================
   [backend-security]  Running Bandit, pip-audit...
   [frontend-security] Running npm audit, retire.js...

   Security scans: PASSED/FAILED
   ```

7. **Summary**
   **Output:**
   ```
   =====================================================
   Local CI Complete!
   =====================================================

   Results (same as GitHub Actions will run):
   - Backend Tests:    PASSED/FAILED
   - Frontend Tests:   PASSED/FAILED
   - Security Scans:   PASSED/FAILED (or SKIPPED with --quick)

   Artifacts saved to: .act/artifacts/
   Cache stored at: .act/cache/

   Ready to push! Your changes will pass CI.

   Common Commands:
     View full logs:    act -j backend-tests -W .github/workflows/main-pipeline.yml -v
     Run specific job:  act -j backend-tests
     List workflows:    act -l
     Clear cache:       rm -rf .act/cache/*

   Next steps:
     - Fix any failing tests
     - '/merge {pr}' to merge the PR (if all tests pass)
     - '/validate {issue}' for feature validation (if not done yet)
   =====================================================
   ```

   *Note: Test results are saved by PostToolUse hook for analysis*

## Quick Mode (--quick)

When invoked with `/test --quick`, skip security scans and run only unit tests:

```bash
# Run only backend unit tests (faster for development iteration)
act -j backend-tests -W .github/workflows/main-pipeline.yml --matrix test-type:unit
```

## Security Mode (--security)

When invoked with `/test --security`, run only security scans:

```bash
# Run all security scans
act -j backend-security -j frontend-security -j repository-security -W .github/workflows/main-pipeline.yml
```

## Configuration

All act settings are stored in `.actrc`:

```
# Container architecture (required for Apple Silicon)
--container-architecture linux/amd64

# Ubuntu image for GitHub Actions compatibility
-P ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-latest

# Secrets and environment
--secret-file .act-secrets
--env-file .env.local

# Performance optimizations
--reuse
--bind

# Local artifact and cache storage
--artifact-server-path .act/artifacts
--cache-server-path .act/cache
```

## Troubleshooting

### "act not found"
```bash
# Install act (macOS)
brew install act

# Or with Go
go install github.com/nektos/act@latest
```

### "Docker not running"
Start Docker Desktop and try again.

### "Container architecture issues" (Apple Silicon)
The `.actrc` file already configures `--container-architecture linux/amd64`.

### "Secrets not loading"
```bash
# Regenerate secrets
rm .act-secrets
./scripts/create-act-secrets.sh

# Verify secrets exist
cat .act-secrets | head -5
```

### "Workflow not triggering"
Some reusable workflows (`workflow_call`) may need explicit job targeting:
```bash
# Use main pipeline with specific jobs
act -W .github/workflows/main-pipeline.yml -j backend-tests -j frontend-tests
```

### "Tests pass locally but fail on GitHub"
1. Ensure you're using the same Node/Python versions
2. Check that all secrets are properly set
3. Run with `-v` for verbose output to compare

### "Cache not working"
```bash
# Clear and recreate cache directory
rm -rf .act/cache/*
mkdir -p .act/cache

# First run will be slower, subsequent runs use cache
```

## How This Mirrors GitHub Actions

| Local Command | GitHub Workflow |
|---------------|-----------------|
| `act -j backend-tests` | `test-backend.yml` (via main-pipeline) |
| `act -j frontend-tests` | `test-frontend.yml` (via main-pipeline) |
| `act -j backend-security` | `security-scan-backend.yml` |
| `act -j frontend-security` | `security-scan-frontend.yml` |

The same Docker containers, same test commands, same environment variables = same results.

## Local Storage

- **Artifacts** (`.act/artifacts/`): Test results, coverage reports, build outputs
- **Cache** (`.act/cache/`): npm packages, pip packages, downloaded dependencies

These directories are gitignored and persist between runs for faster iteration.
