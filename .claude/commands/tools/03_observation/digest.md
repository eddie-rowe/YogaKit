---
model: sonnet
description: Weekly Observation Digest
---

# /digest - Weekly Observation Digest

Generate a weekly synthesis of production observability data that feeds into the PM loop. This is the key handoff document from the Observation Loop to the PM Loop.

## Usage
```
/digest
```

## Examples
```
/digest
```

## Execution

When invoked with `/digest`, execute these steps:

1. **Begin Digest Generation**
   **Output:**
   ```
   🔍 Generating observation digest...
   📊 Aggregating metrics from the past 7 days
   ```

2. **Gather System Health Data**
   ```
   # Check current system status
   # Query Datadog for service health metrics
   # Aggregate error rates and latency trends

   # If Datadog API not available, gather from:
   # - Recent deployment logs
   # - GitHub Actions status
   # - Supabase logs
   ```
   **Output:**
   ```
   📈 System Health:
     Services Healthy: {count}/{total}
     Overall Status: GREEN/YELLOW/RED
   ```

3. **Aggregate SLO Metrics**
   ```
   # Query SLO compliance for all services
   # Calculate error budget consumption
   # Identify services approaching budget exhaustion

   # Key SLOs to track:
   # - API latency p95 < 200ms
   # - Frontend FCP < 1.5s
   # - Error rate < 0.1%
   # - Uptime > 99.9%
   ```
   **Output:**
   ```
   📊 SLO Status:
     Services in Budget: {count}/{total}
     Error Budget Consumed: {percentage}%
     At-Risk Services: {list or "None"}
   ```

4. **Analyze Performance Trends**
   ```
   # Compare this week vs. 4-week average
   # Use p50, p95, p99 percentiles
   # Flag changes > 2 standard deviations

   # Metrics to track:
   # - API response times by endpoint
   # - Database query latency
   # - Edge function execution time
   # - Frontend bundle performance
   ```
   **Output:**
   ```
   📈 Performance Trends (WoW):
     API Latency: {value}ms ({change})
     DB Queries: {value}ms ({change})
     Frontend FCP: {value}s ({change})

   ⚠️ Significant Changes:
     - {metric}: {description of change}
   ```

5. **Gather User Experience Insights**
   ```
   # Query RUM data if available
   # Analyze session completion rates
   # Identify top user friction points

   # Key UX metrics:
   # - Core Web Vitals (LCP, FID, CLS)
   # - Session error rates
   # - Feature usage patterns
   # - User journey completion
   ```
   **Output:**
   ```
   👤 User Experience:
     Session Error Rate: {percentage}%
     Journey Completion: {percentage}%
     Core Web Vitals: {pass/fail}

   Top Friction Points:
     1. {page/feature}: {issue}
     2. {page/feature}: {issue}
   ```

6. **Review Recent Incidents**
   ```
   # Check for incidents in the past week
   # Summarize impact and resolution
   # Link to postmortems if available
   ```
   **Output:**
   ```
   🚨 Incidents This Week: {count}
     {If any:}
     - INC-{id}: {brief description} - {status}
   ```

6.5. **Gather Security Insights**
   ```
   # Query Datadog Security Monitoring for signals
   # Analyze security events by severity
   # Review active security rules
   # Identify security trends

   # Use pup for security signal queries:
   pup logs search --query "service:nextmove @threat.severity:critical OR @threat.severity:high" --from 7d

   # Key security metrics:
   # - Security signals by severity
   # - Active security rules
   # - Security posture trends
   # - Top triggered rules
   ```
   **Output:**
   ```
   🔒 Security Summary:
     Security Signals: {count} this week
     Critical: {count}, High: {count}, Medium: {count}, Low: {count}
     Active Rules: {count}
     Trend: IMPROVING/STABLE/DEGRADING vs last week

   Notable Security Events:
     - {signal}: {severity} - {timestamp}
   ```

7. **Generate Recommended Actions**
   ```
   # Based on trends and insights, suggest actions
   # Categorize by: Performance, Reliability, UX, Security
   # Frame as "Consider:" to leave decision to PM
   ```
   **Output:**
   ```
   💡 Recommended Actions:
     - Consider: {action based on trends}
     - Consider: {action based on incidents}
     - Consider: {action based on UX insights}
   ```

8. **Create Digest Document**
   ```
   # Generate markdown document
   DATE=$(date +%Y-%m-%d)
   mkdir -p docs/observation/digests
   # Save to docs/observation/digests/YYYY-MM-DD.md
   ```

9. **Complete Digest**
   **Output:**
   ```
   ═══════════════════════════════════════════════════════════════
   ✅ Observation Digest Complete
   ═══════════════════════════════════════════════════════════════

   📁 Report saved: docs/observation/digests/YYYY-MM-DD.md
   📂 Context updated for PM loop

   💡 Next steps:
      • '/audit' - Run PM audit with digest insights
      • '/status' - Check current real-time health
      • '/autoobs' - Run full observation sweep
   ═══════════════════════════════════════════════════════════════
   ```

## Digest Document Structure

The generated digest follows this template:

```markdown
# Observation Digest: Week of YYYY-MM-DD

## System Health Summary
- **Overall Status**: GREEN/YELLOW/RED
- **Services Healthy**: X of Y
- **SLO Compliance**: X of Y services within budget
- **Error Budget Consumed**: N% of monthly budget

## Trends Requiring Attention

### Performance
1. [Trend] Description with WoW comparison
2. [Trend] Description with WoW comparison

### Reliability
1. [Trend] Description with error rate/uptime data
2. [Trend] Description with incident correlation

### User Experience
1. [Trend] Description with session/journey data
2. [Trend] Description with friction point analysis

## Incidents This Week
| ID | Severity | Duration | Impact | Status |
|----|----------|----------|--------|--------|
| INC-001 | SEV2 | 30min | API latency | Resolved |

## Security Summary
- **Security Signals**: N this week (N critical, N high, N medium, N low)
- **Active Rules**: N
- **Trend**: IMPROVING/STABLE/DEGRADING vs last week

### Notable Security Events
| Signal | Severity | Rule | Timestamp |
|--------|----------|------|-----------|
| Suspicious login | High | Brute force detection | 2026-02-08 14:23 UTC |

### Security Posture
- All critical security rules enabled: ✅
- No critical signals in past 7 days: ✅
- Security monitoring configured: ✅

## User Experience Insights
- **Session Error Rate**: N%
- **Journey Completion**: N%
- **Core Web Vitals**: PASS/FAIL (LCP: Xms, FID: Xms, CLS: X.XX)

### Top Friction Points
1. {Page}: {Description of user friction}
2. {Feature}: {Description of user friction}

### Feature Usage
| Feature | Usage | Trend |
|---------|-------|-------|
| Dashboard | X sessions | +N% |
| Devices | Y sessions | -N% |

## Recommended Actions

Based on this week's observations, consider the following for PM review:

- **[Performance]** Consider: {Specific action with supporting data}
- **[Reliability]** Consider: {Specific action with supporting data}
- **[UX]** Consider: {Specific action with supporting data}
- **[Security]** Consider: {Specific action with supporting data}

## Metrics Appendix

### API Performance (p95)
| Endpoint | This Week | 4-Week Avg | Change |
|----------|-----------|------------|--------|
| /api/farms | Xms | Yms | +Z% |

### Database Performance
| Query Type | This Week | 4-Week Avg | Change |
|------------|-----------|------------|--------|
| SELECT | Xms | Yms | +Z% |

### Error Rates
| Service | This Week | 4-Week Avg | Change |
|---------|-----------|------------|--------|
| API | X% | Y% | +Z% |

---
*Generated by /digest on YYYY-MM-DD*
*Next digest due: YYYY-MM-DD*
```

## Data Sources

### Primary (if Datadog configured)
- APM metrics for latency and throughput
- RUM for user experience metrics
- Infrastructure metrics for system health
- Log aggregations for error patterns
- Security Monitoring for security signals and rules

### Fallback (if Datadog unavailable)
- GitHub Actions workflow runs
- Supabase logs and metrics
- Recent deployment history
- Manual service health checks

## Integration

### Feeds Into
- `/audit` - PM audit reads recent digests to inform planning
- `/vision` - Production insights guide product direction
- `/roadmap` - Priorities informed by real-world data

### Generated By
- `/autoobs` - Includes digest as final step
- Can also be run standalone weekly

## Context Updates

Updates `.claude/context/simple-context.yaml`:
```yaml
observation_phase: digest
observation_context:
  last_digest: "YYYY-MM-DD"
  system_status: "green"
  slo_services_in_budget: 5
  slo_services_total: 6
  trends_flagged: 3
  incidents_this_week: 0
```

## Querying Datadog (pup)

> Auth: see `docs/OBSERVABILITY.md` for install and login steps.

### Full digest sweep (run in order)
```bash
pup monitors list -o table
pup slos list -o table
pup apm services -o table
pup events list --from 7d -o table
```

### Error logs (last 7d)
```bash
pup logs search --query "service:nextmove status:error" --from 7d
```

### Inngest function errors (last 7d)
```bash
pup logs search --query "service:nextmove (@function.name:briefing-compose OR @function.name:briefing-daily-dispatch OR @function.name:first-sync-on-connect OR @function.name:integration-health-check OR @function.name:scoring-adaptation OR @function.name:snooze-requeue OR @function.name:trial-ending-email) status:error" --from 7d
```

### RUM actions (last 7d)
```bash
pup rum sessions --query "@type:action service:nextmove" --from 7d
```

### Security signals (last 7d)
```bash
pup logs search --query "service:nextmove @threat.severity:critical OR @threat.severity:high" --from 7d
```

## Datadog UI Links

### Security Monitoring
- **Security Signals**: https://us5.datadoghq.com/security
- **Security Rules**: https://us5.datadoghq.com/security/configuration/rules
- **Cloud SIEM**: https://us5.datadoghq.com/security/cloud-siem

### Other Products
- **APM Services**: https://us5.datadoghq.com/apm/services
- **RUM Explorer**: https://us5.datadoghq.com/rum/explorer
- **Log Explorer**: https://us5.datadoghq.com/logs
- **Monitors**: https://us5.datadoghq.com/monitors/manage
- **SLOs**: https://us5.datadoghq.com/slo

## Output Location

`docs/observation/digests/YYYY-MM-DD.md`
