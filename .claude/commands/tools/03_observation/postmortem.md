---
model: sonnet
description: Incident Postmortem
argument-hint: "[incident-id]"
---

# /postmortem - Incident Postmortem

Generate a comprehensive postmortem analysis for a resolved incident, including root cause analysis, timeline review, and preventive action items.

## Usage
```
/postmortem <incident-id>
```

## Examples
```
/postmortem INC-001
/postmortem INC-20251222-001
```

## Execution

When invoked with `/postmortem <incident-id>`, execute these steps:

1. **Load Incident Data**
   ```
   # Read incident document from docs/observation/incidents/
   # Verify incident is resolved
   # Gather timeline and resolution data
   ```
   **Output:**
   ```
   📋 Loading incident: {incident-id}
   ✅ Status: Resolved
   ⏱️ Duration: {hours}h {minutes}m
   ```

2. **Verify Incident Closed**
   ```
   # Check incident status is "Resolved"
   # If not, prompt to close incident first
   ```
   **Output (if not resolved):**
   ```
   ⚠️ Incident {id} is still active.
   Please resolve the incident before generating postmortem.

   Use '/incident {id}' to update status.
   ```

3. **Begin Postmortem**
   **Output:**
   ```
   📝 Generating postmortem for {incident-id}...
   🔍 Analyzing incident timeline and impact
   ```

4. **Reconstruct Timeline**
   ```
   # Pull timeline from incident document
   # Enrich with metrics data if available
   # Identify key moments
   ```
   **Output:**
   ```
   ⏱️ Incident Timeline:

   Detection Phase:
   | Time | Event | Source |
   |------|-------|--------|
   | 14:23 | Alert triggered | Datadog |
   | 14:25 | On-call notified | PagerDuty |
   | 14:28 | Incident declared | Manual |

   Investigation Phase:
   | Time | Event |
   |------|-------|
   | 14:30 | Initial assessment started |
   | 14:45 | Root cause identified |

   Resolution Phase:
   | Time | Event |
   |------|-------|
   | 14:50 | Fix deployed |
   | 15:05 | Services verified |
   | 15:10 | Incident resolved |
   ```

5. **Conduct Root Cause Analysis**
   ```
   # Apply 5 Whys methodology
   # Identify contributing factors
   # Document systemic issues
   ```
   **Output:**
   ```
   🔍 Root Cause Analysis:

   5 Whys:
   1. Why did the service fail?
      → Database connection pool exhausted

   2. Why was the pool exhausted?
      → Spike in concurrent requests

   3. Why was there a spike?
      → Batch job ran during peak hours

   4. Why did it run during peak hours?
      → Cron schedule not updated after timezone change

   5. Why wasn't this caught?
      → No monitoring on batch job timing

   Root Cause: Batch job scheduled at wrong time due to
   timezone configuration not being updated.

   Contributing Factors:
   - Insufficient connection pool monitoring
   - Batch job not isolated from main database
   - No capacity planning for batch operations
   ```

6. **Calculate Impact**
   ```
   # Quantify user impact
   # Calculate SLO budget consumption
   # Estimate business impact
   ```
   **Output:**
   ```
   📊 Impact Assessment:

   Duration:
   - Time to detect: 5 minutes
   - Time to resolve: 47 minutes
   - Total duration: 52 minutes

   User Impact:
   - Users affected: ~450
   - Failed requests: 1,234
   - Sessions interrupted: 89

   SLO Impact:
   - Availability: 99.9% → 99.85%
   - Error budget consumed: 15%

   Business Impact:
   - Estimated revenue impact: $X
   - Customer complaints: Y
   ```

7. **Evaluate Response**
   ```
   # Review detection effectiveness
   # Assess response time
   # Identify what went well/poorly
   ```
   **Output:**
   ```
   🎯 Response Evaluation:

   What Went Well:
   ✅ Quick detection (5 min)
   ✅ Clear escalation path
   ✅ Effective communication

   What Could Improve:
   ⚠️ Root cause took 17 min to identify
   ⚠️ Runbook outdated
   ⚠️ No automated mitigation

   Response Metrics:
   - MTTD (Mean Time to Detect): 5 min
   - MTTR (Mean Time to Resolve): 47 min
   - Communication updates: 3
   ```

8. **Generate Action Items**
   ```
   # Categorize by priority
   # Assign owners if possible
   # Set due dates
   ```
   **Output:**
   ```
   📋 Action Items:

   Immediate (P1):
   - [ ] Add connection pool monitoring alerts
   - [ ] Review and update batch job schedules

   Short-term (P2):
   - [ ] Implement connection pool auto-scaling
   - [ ] Create batch job runbook
   - [ ] Add timezone validation to config

   Long-term (P3):
   - [ ] Separate batch job database
   - [ ] Implement chaos engineering tests
   - [ ] Review capacity planning process
   ```

9. **Create Postmortem Document**
   ```
   # Generate full postmortem document
   # Save to docs/observation/postmortems/
   ```

10. **Complete Postmortem**
    **Output:**
    ```
    ═══════════════════════════════════════════════════════════════
    ✅ Postmortem Complete
    ═══════════════════════════════════════════════════════════════

    📁 Document: docs/observation/postmortems/PM-{id}.md
    📋 Action Items: {count}

    Summary:
    - Duration: 52 minutes
    - Root Cause: Batch job timezone misconfiguration
    - Error Budget Impact: 15%

    💡 Next steps:
       • Review postmortem with team
       • Create GitHub issues for action items
       • Schedule follow-up review
       • '/digest' - Include in weekly report
    ═══════════════════════════════════════════════════════════════
    ```

## Postmortem Document Template

```markdown
# Postmortem: {incident-id} - {Title}

## Incident Overview
| Field | Value |
|-------|-------|
| Date | YYYY-MM-DD |
| Duration | Xh Ym |
| Severity | SEV{level} |
| Author | {name} |
| Review Date | YYYY-MM-DD |

## Executive Summary
{One paragraph description of what happened, impact, and resolution}

## Impact
- **Users affected**: X
- **Failed requests**: Y
- **Revenue impact**: $Z
- **SLO budget consumed**: N%

## Timeline
| Time (UTC) | Event |
|------------|-------|
| HH:MM | Detection |
| HH:MM | Response started |
| HH:MM | Root cause identified |
| HH:MM | Fix deployed |
| HH:MM | Verified resolved |

## Root Cause Analysis

### 5 Whys
1. Why? → {answer}
2. Why? → {answer}
3. Why? → {answer}
4. Why? → {answer}
5. Why? → {answer}

### Root Cause Statement
{Clear statement of the root cause}

### Contributing Factors
1. {factor}
2. {factor}
3. {factor}

## Detection
- How was the issue detected? {method}
- Was alerting effective? {yes/no, why}
- Detection time: {X minutes}

## Response
- Response time: {X minutes}
- Was runbook followed? {yes/no}
- What worked well? {list}
- What could improve? {list}

## Resolution
{Step-by-step description of the fix}

## Action Items

### Immediate (P1)
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| {action} | {name} | {date} | Open |

### Short-term (P2)
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| {action} | {name} | {date} | Open |

### Long-term (P3)
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| {action} | {name} | {date} | Open |

## Lessons Learned
1. {lesson}
2. {lesson}
3. {lesson}

## Related Incidents
- {link to similar incidents if any}

---
*Generated by /postmortem on YYYY-MM-DD*
*Review scheduled: YYYY-MM-DD*
```

## Blameless Culture

Postmortems focus on **systems and processes**, not individuals:
- Use passive voice for failures ("the config was incorrect" not "Alice set the wrong config")
- Focus on systemic improvements
- Encourage learning over blame
- Document what the system allowed to happen

## Integration

### Related Commands
- `/incident` - Must be resolved before postmortem
- `/digest` - Postmortems summarized in weekly report

### Feeds Into
- Action items may become GitHub issues
- Learnings inform future incident response
- Trends analyzed across postmortems

## Output Location

`docs/observation/postmortems/PM-{incident-id}.md`

## Context Updates

Updates `.claude/context/simple-context.yaml`:
```yaml
observation_phase: postmortem
observation_context:
  last_postmortem: "PM-INC-20251222-001"
  postmortem_action_items: 7
  postmortem_date: "YYYY-MM-DD"
```
