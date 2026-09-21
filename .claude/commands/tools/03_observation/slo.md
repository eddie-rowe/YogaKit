---
model: sonnet
description: SLO Compliance Tracking
argument-hint: "[service]"
---

# /slo - SLO Compliance Tracking

Track Service Level Objective compliance, error budget consumption, and burn rates across all services.

## Usage
```
/slo [service]
```

## Examples
```
/slo
/slo api
/slo frontend
/slo database
```

## Execution

When invoked with `/slo [service]`, execute these steps:

1. **Parse Parameters**
   ```
   # If no service specified, show all services
   # Valid services: api, frontend, database, edge-functions, all
   ```

2. **Begin SLO Check**
   **Output:**
   ```
   🎯 Checking SLO compliance...
   📊 Calculating error budgets for: {service or "all services"}
   ```

3. **Define SLO Targets**
   ```
   # SLO definitions for NextMove (defined as JSON manifests in `datadog/slos/`):
   #
   # [NextMove] API Availability:
   #   - Type: Monitor-based (tracks [NextMove] API Error Rate monitor)
   #   - Target: 99.9% | Warning: 99.95% (30d window)
   #
   # [NextMove] Homepage Uptime:
   #   - Type: Monitor-based (tracks [Synthetics] Homepage loads test)
   #   - Target: 99.95% | Warning: 99.99% (30d window)
   #
   # Recommended additions (not yet defined):
   #   - briefing-daily-dispatch success rate: 99.9% (7d)
   #   - first-sync-on-connect success rate: 95% (7d)
   ```

4. **Calculate Error Budget Status**
   ```
   # For each service, calculate:
   # - Budget allowed = (1 - SLO target) * time period
   # - Budget consumed = actual failures / total requests
   # - Budget remaining = budget allowed - budget consumed
   # - Burn rate = consumption rate vs. expected rate
   ```
   **Output:**
   ```
   💰 Error Budget Status (30-day window):

   | Service | SLO | Current | Budget | Burn Rate |
   |---------|-----|---------|--------|-----------|
   | API | 99.9% | 99.95% | 68% | 0.5x ✅ |
   | Frontend | 99.9% | 99.85% | 32% | 1.5x ⚠️ |
   | Database | 99.95% | 99.98% | 85% | 0.3x ✅ |
   | Edge Funcs | 99.5% | 99.2% | 15% | 2.5x ❌ |
   ```

5. **Show Latency SLOs**
   ```
   # Query latency percentiles for each service
   # Compare to SLO targets
   ```
   **Output:**
   ```
   ⏱️ Latency SLOs:

   | Service | Target | p50 | p95 | p99 | Status |
   |---------|--------|-----|-----|-----|--------|
   | API | <200ms | 45ms | 180ms | 350ms | ✅ |
   | Frontend FCP | <1.5s | 0.8s | 1.2s | 1.8s | ✅ |
   | Database | <50ms | 8ms | 35ms | 120ms | ✅ |
   | Edge Funcs | <500ms | 85ms | 420ms | 890ms | ⚠️ |
   ```

6. **Budget Forecast**
   ```
   # Based on current burn rate, predict:
   # - Days until budget exhaustion
   # - Recommended actions if at risk
   ```
   **Output:**
   ```
   📅 Budget Forecast:

   | Service | Days Left | Risk Level |
   |---------|-----------|------------|
   | API | >30 days | Low |
   | Frontend | 12 days | Medium |
   | Database | >30 days | Low |
   | Edge Funcs | 3 days | High |

   ⚠️ Edge Functions at risk of exhausting budget
     Current burn rate: 2.5x normal
     Action: Investigate error spike in /api/automation functions
   ```

7. **Historical Trend**
   ```
   # Show 4-week SLO trend
   # Identify improving/degrading patterns
   ```
   **Output:**
   ```
   📈 4-Week SLO Trend:

   API:       99.92% → 99.95% → 99.94% → 99.95% ↑
   Frontend:  99.91% → 99.88% → 99.87% → 99.85% ↓
   Database:  99.97% → 99.98% → 99.98% → 99.98% →
   Edge:      99.45% → 99.35% → 99.25% → 99.20% ↓
   ```

8. **Complete SLO Check**
   **Output:**
   ```
   ═══════════════════════════════════════════════════════════════
   🎯 SLO Summary
   ═══════════════════════════════════════════════════════════════

   Services Meeting SLO: 3/4
   Overall Error Budget: 45% remaining
   At-Risk Services: Edge Functions

   Recommendations:
     - 🔴 Edge Functions: Immediate investigation needed
     - 🟡 Frontend: Monitor FCP trends

   💡 Next steps:
      • '/metrics edge-functions' - Investigate edge function issues
      • '/incident' - Start incident if SLO breach imminent
      • '/digest' - Include in weekly report
   ═══════════════════════════════════════════════════════════════
   ```

## SLO Definitions

Defined as JSON manifests in `datadog/slos/`, synced via `tsx scripts/datadog/sync.ts`:

| SLO | Type | Target | Warning | Window |
|-----|------|--------|---------|--------|
| [NextMove] API Availability | Monitor-based | 99.9% | 99.95% | 30 days |
| [NextMove] Homepage Uptime | Monitor-based | 99.95% | 99.99% | 30 days |

## Burn Rate Indicators

| Rate | Meaning | Action |
|------|---------|--------|
| < 1x | Consuming slower than expected | ✅ No action |
| 1-2x | Consuming at expected rate | → Monitor |
| 2-3x | Consuming faster than expected | ⚠️ Investigate |
| > 3x | Rapid consumption | ❌ Immediate action |

## Data Sources

- Datadog SLO dashboards (if configured)
- APM metrics for latency
- Error tracking for availability
- RUM for frontend metrics

## Querying Datadog (pup)

> Auth: see `docs/OBSERVABILITY.md` for install and login steps.

### List all SLOs
```bash
pup slos list -o table
```

### SLO status (30-day window)
```bash
# Get <slo-id> from the list above
pup slos status <slo-id>
```

### SLO detail
```bash
pup slos get <slo-id>
```

### SLO burn-rate monitors
```bash
pup monitors list --tags slo -o table
```

### API availability (calculated from APM, last 30d)
```bash
pup metrics query --query "(sum:trace.next_js.BaseServer.handleRequest.hits{service:nextmove,env:prod}.as_count()-sum:trace.next_js.BaseServer.handleRequest.errors{service:nextmove,env:prod}.as_count())/sum:trace.next_js.BaseServer.handleRequest.hits{service:nextmove,env:prod}.as_count()*100" --from 30d
```

### Datadog UI links
- **SLOs**: https://us5.datadoghq.com/slo
- **SLO monitors**: https://us5.datadoghq.com/monitors/manage?q=type:slo

## Integration

### Related Commands
- `/status` - Quick health check before deep SLO dive
- `/metrics` - Detailed metric analysis for troubled services
- `/incident` - If SLO breach is imminent
- `/digest` - SLO summary included in weekly report

## Context Updates

Updates `.claude/context/simple-context.yaml`:
```yaml
observation_phase: slo
observation_context:
  slo_services_in_budget: 3
  slo_services_total: 4
  at_risk_services: ["edge-functions"]
  error_budget_remaining: 45
  last_slo_check: "YYYY-MM-DD HH:MM"
```
