---
model: haiku
description: System Health Status
---

# /status - System Health Status

Display real-time system health with trend indicators showing whether each service is improving, degrading, or stable.

## Usage
```
/status
```

## Examples
```
/status
```

## Execution

When invoked with `/status`, execute these steps:

1. **Begin Status Check**
   **Output:**
   ```
   🔍 Checking system health...
   📊 Gathering real-time metrics
   ```

2. **Check Service Health**
   ```
   # Query service health endpoints
   # Check Datadog service status if available
   # Fallback: ping health endpoints directly

   # Services to check:
   # - Frontend (Next.js)
   # - Backend API (Next.js API routes)
   # - Database (Supabase/PostgreSQL)
   # - Inngest (briefing-compose, briefing-daily-dispatch, first-sync-on-connect, integration-health-check, scoring-adaptation, snooze-requeue, trial-ending-email)
   # - External integrations (Shopify, QuickBooks Online, Gmail, Klaviyo)
   ```
   **Output:**
   ```
   🏥 Service Health:

   | Service | Status | Latency | Trend |
   |---------|--------|---------|-------|
   | Frontend | ✅ UP | 45ms | → |
   | Backend API | ✅ UP | 120ms | ↑ |
   | Database | ✅ UP | 8ms | → |
   | Inngest | ✅ UP | 85ms | → |
   | Shopify integration | ✅ UP | 200ms | → |
   | Klaviyo integration | ✅ UP | 180ms | → |
   ```

3. **Check Recent Alerts**
   ```
   # Query Datadog for recent alerts
   # Check GitHub Actions for failed workflows
   # Review Supabase logs for errors
   ```
   **Output:**
   ```
   🚨 Recent Alerts (24h):
     - {alert_1}: {status}
     - {alert_2}: {status}
     or
     ✅ No alerts in the past 24 hours
   ```

4. **Check Error Rates**
   ```
   # Query error rates for all services
   # Compare to baseline
   # Flag significant increases
   ```
   **Output:**
   ```
   📊 Error Rates (1h):
     API: 0.02% (baseline: 0.05%) ✅
     Frontend: 0.1% (baseline: 0.1%) →
     Edge Functions: 0.5% (baseline: 0.2%) ⚠️
   ```

5. **Check Resource Utilization**
   ```
   # Query infrastructure metrics
   # CPU, memory, connection pools
   ```
   **Output:**
   ```
   💾 Resource Utilization:
     CPU: 35% (threshold: 80%)
     Memory: 62% (threshold: 85%)
     DB Connections: 15/100 (15%)
   ```

6. **Overall Status Summary**
   ```
   # Determine overall system status
   # GREEN: All services healthy, no alerts
   # YELLOW: Some warnings, degraded performance
   # RED: Critical issues, service outages
   ```
   **Output:**
   ```
   ═══════════════════════════════════════════════════════════════
   📊 Overall Status: GREEN ✅
   ═══════════════════════════════════════════════════════════════

   Services: 6/6 healthy
   Alerts: 0 active
   Error Rate: Within baseline
   Resources: Normal utilization

   💡 Next steps:
      • '/slo' - Check SLO compliance
      • '/metrics' - Deep dive into trends
      • '/digest' - Generate weekly report
   ═══════════════════════════════════════════════════════════════
   ```

## Status Indicators

| Status | Meaning | Icon |
|--------|---------|------|
| UP | Service responding normally | ✅ |
| SLOW | Response time elevated | ⚠️ |
| DOWN | Service not responding | ❌ |
| UNKNOWN | Cannot determine status | ❓ |

## Trend Indicators

| Trend | Meaning | Icon |
|-------|---------|------|
| Improving | Metrics better than last period | ↑ |
| Stable | Metrics consistent | → |
| Degrading | Metrics worse than last period | ↓ |

## Data Sources

- Datadog APM and Infrastructure (if configured)
- Direct health endpoint checks
- GitHub Actions status
- Supabase dashboard metrics

## Querying Datadog (pup)

> Auth: see `docs/OBSERVABILITY.md` for install and login steps.

### Active monitors
```bash
pup monitors list -o table
```

### Service health (APM)
```bash
pup apm services -o table
```

### Recent alerts (last 24h)
```bash
pup events list --from 24h -o table
```

### API error rate (last 1h)
```bash
pup metrics query --query "sum:trace.next_js.BaseServer.handleRequest.errors{service:nextmove,env:prod}.as_rate()/sum:trace.next_js.BaseServer.handleRequest.hits{service:nextmove,env:prod}.as_rate()*100" --from 1h
```

### Datadog UI links
- **Monitors**: https://us5.datadoghq.com/monitors/manage?q=service:nextmove
- **APM Services**: https://us5.datadoghq.com/apm/services?env=prod
- **Infrastructure**: https://us5.datadoghq.com/infrastructure

## Integration

### Related Commands
- `/slo` - Detailed SLO compliance after status check
- `/metrics` - Deep dive into specific metrics
- `/incident` - If status shows issues, start incident response

## Context Updates

Updates `.claude/context/simple-context.yaml`:
```yaml
observation_phase: status
observation_context:
  system_status: "green"  # green, yellow, red
  services_healthy: 6
  services_total: 6
  active_alerts: 0
  last_status_check: "YYYY-MM-DD HH:MM"
```
