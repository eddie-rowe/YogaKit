---
model: sonnet
description: Trend Analysis
argument-hint: "[scope]"
---

# /metrics - Trend Analysis

Analyze performance trends with anomaly detection, comparing current metrics against statistical baselines.

## Usage
```
/metrics [scope]
```

## Examples
```
/metrics
/metrics api
/metrics frontend
/metrics database
/metrics edge-functions
```

## Execution

When invoked with `/metrics [scope]`, execute these steps:

1. **Parse Parameters**
   ```
   # Default scope: all
   # Valid scopes: all, api, frontend, database, edge-functions
   ```

2. **Begin Metrics Analysis**
   **Output:**
   ```
   📊 Analyzing metrics trends...
   🔬 Scope: {scope}
   📅 Comparing: This week vs. 4-week baseline
   ```

3. **Gather Baseline Data**
   ```
   # Calculate 4-week rolling averages for each metric
   # Calculate standard deviation for anomaly detection
   # Threshold: Flag changes > 2 standard deviations
   ```

4. **Analyze API Metrics** (if scope includes API)
   ```
   # Latency percentiles (p50, p95, p99)
   # Throughput (requests/sec)
   # Error rates by endpoint
   # Response size trends
   ```
   **Output:**
   ```
   🔌 API Metrics:

   Latency (ms):
   | Percentile | Current | Baseline | Change | Status |
   |------------|---------|----------|--------|--------|
   | p50 | 45 | 42 | +7% | ✅ |
   | p95 | 180 | 165 | +9% | ✅ |
   | p99 | 350 | 280 | +25% | ⚠️ |

   Throughput: 125 req/s (baseline: 110 req/s) ↑ +14%
   Error Rate: 0.02% (baseline: 0.05%) ✅ -60%

   Top Endpoints by Latency:
   | Endpoint | p95 | Trend |
   |----------|-----|-------|
   | POST /api/inngest | 95ms | → |
   | POST /api/slack/events | 145ms | ↑ |
   | GET /api/integrations/shopify/callback | 210ms | ↑ |
   ```

5. **Analyze Frontend Metrics** (if scope includes frontend)
   ```
   # Core Web Vitals (LCP, FID, CLS)
   # Page load times
   # Bundle sizes
   # JavaScript errors
   ```
   **Output:**
   ```
   🖥️ Frontend Metrics:

   Core Web Vitals:
   | Metric | Current | Target | Status |
   |--------|---------|--------|--------|
   | LCP | 1.8s | <2.5s | ✅ |
   | FID | 45ms | <100ms | ✅ |
   | CLS | 0.08 | <0.1 | ✅ |

   Page Performance:
   | Page | Load Time | Trend |
   |------|-----------|-------|
   | /settings | 1.2s | → |
   | /setup | 1.8s | ↓ |
   | /login | 0.9s | → |

   Bundle Size: 245KB (baseline: 240KB) +2%
   JS Errors: 0.1% sessions (baseline: 0.12%) ✅
   ```

6. **Analyze Database Metrics** (if scope includes database)
   ```
   # Query latency by type
   # Connection pool utilization
   # Cache hit rates
   # RLS policy performance
   ```
   **Output:**
   ```
   🗄️ Database Metrics:

   Query Performance (p95):
   | Query Type | Current | Baseline | Change |
   |------------|---------|----------|--------|
   | SELECT | 12ms | 10ms | +20% | ✅ |
   | INSERT | 8ms | 7ms | +14% | ✅ |
   | UPDATE | 15ms | 12ms | +25% | ⚠️ |
   | RLS Check | 3ms | 2ms | +50% | ⚠️ |

   Connection Pool: 15/100 (15%)
   Cache Hit Rate: 94% (baseline: 92%) ✅
   Slow Queries (>100ms): 3 this week
   ```

7. **Analyze Edge Function Metrics** (if scope includes edge-functions)
   ```
   # Execution time
   # Cold start frequency
   # Error rates by function
   # Invocation counts
   ```
   **Output:**
   ```
   ⚡ Inngest Function Metrics:

   Execution Time (p95):
   | Function | Current | Baseline | Change |
   |----------|---------|----------|--------|
   | briefing-compose | 4.2s | 3.8s | +11% | ✅ |
   | briefing-daily-dispatch | 8.5s | 7.0s | +21% | ⚠️ |
   | first-sync-on-connect | 3.1s | 2.9s | +7% | ✅ |
   | scoring-adaptation | 1.2s | 1.1s | +9% | ✅ |

   Error Rate: 0.5% (baseline: 0.2%) ⚠️
   Total Runs: 342 this week (+8%)
   ```

8. **Anomaly Detection**
   ```
   # Flag metrics with > 2σ deviation
   # Correlate anomalies across services
   # Identify potential root causes
   ```
   **Output:**
   ```
   🔍 Anomaly Detection:

   Significant Deviations (>2σ):
   ┌─────────────────────────────────────────────────────────────┐
   │ ⚠️ API p99 latency: +25% (threshold: ±15%)                 │
   │    Correlation: first-sync-on-connect Shopify batch volume  │
   │    Recommendation: Review Shopify page size or rate limits │
   ├─────────────────────────────────────────────────────────────┤
   │ ⚠️ Inngest briefing-daily-dispatch: +50% execution time     │
   │    Correlation: Gmail thread volume increase               │
   │    Recommendation: Investigate email parsing logic         │
   └─────────────────────────────────────────────────────────────┘
   ```

9. **Complete Metrics Analysis**
   **Output:**
   ```
   ═══════════════════════════════════════════════════════════════
   📊 Metrics Summary
   ═══════════════════════════════════════════════════════════════

   Scope: {scope}
   Period: {date range}
   Anomalies Detected: 2

   Key Findings:
     ✅ Overall system performance stable
     ⚠️ API p99 latency trending up
     ⚠️ Inngest briefing-daily-dispatch execution time degraded

   💡 Next steps:
      • '/slo' - Check if anomalies affect SLOs
      • '/ux' - See user impact of performance changes
      • '/digest' - Include in weekly report
   ═══════════════════════════════════════════════════════════════
   ```

## Scope Options

| Scope | Metrics Analyzed |
|-------|------------------|
| `all` | Complete analysis across all services |
| `api` | Backend API latency, throughput, errors |
| `frontend` | Core Web Vitals, page performance, bundle size |
| `database` | Query performance, connections, cache |
| `edge-functions` | Execution time, cold starts, errors |

## Statistical Methods

### Baseline Calculation
- 4-week rolling average for trend comparison
- Standard deviation calculated over same period
- Weekday vs. weekend patterns considered

### Anomaly Detection
- Flag metrics with > 2 standard deviations from baseline
- Correlate anomalies across services
- Consider seasonal patterns (time of day, day of week)

## Data Sources

- Datadog APM for latency and throughput
- RUM for frontend metrics
- Database metrics from Supabase
- Edge function logs

## Querying Datadog (pup)

> Auth: see `docs/OBSERVABILITY.md` for install and login steps.

### API latency percentiles (last 7d)
```bash
pup metrics query --query "p95:trace.http.request{service:nextmove,env:prod}" --from 7d
pup metrics query --query "p50:trace.http.request{service:nextmove,env:prod}" --from 7d
pup metrics query --query "p99:trace.http.request{service:nextmove,env:prod}" --from 7d
```

### API throughput (requests/sec, last 1h)
```bash
pup metrics query --query "sum:trace.next_js.BaseServer.handleRequest.hits{service:nextmove,env:prod}.as_rate()" --from 1h
```

### Core Web Vitals (RUM, last 7d)
```bash
pup rum sessions --query "@type:view service:nextmove" --from 7d
```

### Top slowest spans (APM, last 24h)
```bash
pup spans search --query "service:nextmove env:prod" --from 24h -o table
```

### Database query latency
```bash
pup metrics query --query "avg:trace.pg.query{service:nextmove,env:prod}" --from 1h
```

### Inngest function metrics
```bash
pup metrics query --query "sum:inngest.function_run.ended.total{service:nextmove}" --from 7d
```

### Datadog UI links
- **APM Services**: https://us5.datadoghq.com/apm/services?env=prod
- **APM Traces**: https://us5.datadoghq.com/apm/traces?query=service:nextmove
- **RUM Performance**: https://us5.datadoghq.com/rum/performance/summary?query=service:nextmove
- **Metrics Explorer**: https://us5.datadoghq.com/metric/explorer

## Integration

### Related Commands
- `/status` - Quick health check
- `/slo` - SLO impact of metric changes
- `/ux` - User experience correlation
- `/digest` - Weekly summary

## Context Updates

Updates `.claude/context/simple-context.yaml`:
```yaml
observation_phase: metrics
observation_context:
  metrics_scope: "all"
  anomalies_detected: 2
  trending_up: ["api_throughput"]
  trending_down: ["edge_function_performance"]
  last_metrics_check: "YYYY-MM-DD HH:MM"
```
