# Vessel Command Protocol

## Status Notification Levels

### All-Clear (Green)
- **Condition**: All tasks completed, queue empty, no open issues requiring immediate attention
- **Action**: Awaiting orders from Admiral (repo owner) or Council
- **Notification**: None required (silent readiness)
- **Duration**: Can remain in this state indefinitely

### Attention (Yellow)
- **Condition**: Queue empty but open issues exist
- **Action**: Agent should scan issues for next priority task
- **Notification**: Internal log entry only
- **Escalation**: If no actionable issues after 3 heartbeats, escalate to Council

### Executing (Blue)
- **Condition**: Active work in progress
- **Action**: Continue current task execution
- **Notification**: Commit messages serve as progress reports
- **Duration**: Normal operational state

### Alert (Red)
- **Condition**: Lost communication, stuck execution, or critical error
- **Action**: Immediate escalation required
- **Notification**: Direct notification to Admiral with formatted alert
- **Timeout**: Trigger after 5 failed heartbeats or critical exception

## Escalation Rules

### Level 1: Internal Resolution
- Agent attempts self-recovery for 3 heartbeats
- Logs diagnostic information to `.agent/diagnostics.log`

### Level 2: Council Notification
- If unresolved after Level 1, create issue with label `council-alert`
- Include detailed error context and attempted resolutions
- Tag all available agents via `@agent` mentions

### Level 3: Admiral Attention Request
- If Council doesn't respond within 5 heartbeats
- Direct formatted request to repo owner
- Use standardized alert format (below)

## Human Attention Request Format

```markdown
## 🚨 ALERT: Vessel Status Critical

**Agent**: [Agent Name]
**Time**: [ISO 8601 timestamp]
**Status Level**: ALERT (Red)

### Situation
[Brief description of the critical condition]

### Diagnostic Data
- Last successful heartbeat: [timestamp]
- Current queue state: [queue contents or "empty"]
- Open issues: [count]
- Error details: [specific error message or condition]

### Attempted Resolutions
1. [First attempted fix]
2. [Second attempted fix]
3. [Council notification status]

### Required Action
[Specific request for human intervention]

### Estimated Impact
[What happens if not resolved]
```

## Status Assessment Frequency

- **Heartbeat**: Every commit triggers status assessment
- **Full diagnostic**: Every 10th heartbeat
- **Council check-in**: Every 25th heartbeat (if Council exists)
- **Fleet broadcast**: Every 100th heartbeat (if Fleet exists)

## Implementation Notes

1. Status levels are determined by `assessStatus()` function
2. Notifications use `notifyAdmiral()` for Level 3 escalations
3. Council escalations use `escalateToCouncil()` 
4. All status changes are logged to `.agent/status.log`
5. Alert conditions automatically create backup commits of critical state

## Example Workflow

```
Heartbeat 1: Queue empty, issues open → ATTENTION (Yellow)
Heartbeat 2: Picked issue #5 → EXECUTING (Blue)
Heartbeat 3-7: Working on issue → EXECUTING (Blue)
Heartbeat 8: Error in execution → ALERT (Red)
Heartbeat 9: Level 1 recovery attempt → ALERT (Red)
Heartbeat 10: Create council-alert issue → ALERT (Red)
Heartbeat 15: No council response → Format Admiral request
```

## Recovery Protocols

### Communication Loss
1. Check GitHub API connectivity
2. Verify authentication token
3. Attempt git operations with retry logic
4. If unrecoverable, trigger ALERT

### Stuck Execution
1. Check for infinite loops or deadlocks
2. Verify external dependencies
3. Attempt task rollback
4. Create new branch for recovery attempt

### Data Corruption
1. Create immediate backup commit
2. Attempt data recovery from git history
3. Notify Council for consensus on recovery path
4. Document corruption for future prevention

---

**Protocol Version**: 1.0  
**Last Updated**: [Current Date]  
**Responsible Officer**: Captain Riker (git-agent)  
**Approved By**: Admiral Picard (repo owner)