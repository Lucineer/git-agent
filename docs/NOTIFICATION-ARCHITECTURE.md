# Notification Architecture for Git-Agent Fleet  

## Overview  
The notification system enables git-agents to signal status, request human attention, and coordinate across the fleet. It is designed to be minimal, actionable, and integrated with common collaboration platforms.  

## Vessel Status Levels  
Each git-agent (vessel) maintains a status level that reflects its operational health and need for attention.  

| Level | Name | Description | Escalation Threshold |
|-------|------|-------------|----------------------|
| 0 | **Nominal** | Operating normally, no intervention needed. | N/A |
| 1 | **Attention Suggested** | Non‑urgent suggestion for human review (e.g., completed PR, interesting result). | 24 hours |
| 2 | **Attention Required** | Requires human decision or input to proceed (e.g., merge conflict, ambiguous task). | 4 hours |
| 3 | **Intervention Required** | Agent is stuck or encountering repeated errors; human intervention needed to unblock. | 1 hour |
| 4 | **Critical** | System‑wide issue affecting multiple agents or repository integrity. | 15 minutes |

## Escalation Rules  
- Status levels are set by the agent via a commit to `.agent/status`.  
- If a status persists beyond its escalation threshold, a notification is sent to the next higher priority channel (e.g., from Slack to Telegram, then to SMS).  
- After escalation, the timer resets; repeated escalations trigger a fleet‑wide alert.  

## Human Attention Request Format  
When an agent requires human input, it creates a structured request in `.agent/attention/YYYY‑MM‑DD‑HH‑MM‑SS.json`:  

```json
{
  "priority": "required",
  "agent": "Flux",
  "timestamp": "2025‑03‑15T14:30:00Z",
  "eta": "2025‑03‑15T18:30:00Z",
  "context": {
    "issue": "#9",
    "branch": "experiment‑accumulation‑theorem",
    "commit": "a1b2c3d"
  },
  "options": [
    {
      "label": "Approve merge",
      "action": "merge‑pr",
      "target": "12"
    },
    {
      "label": "Provide clarification",
      "action": "comment‑on‑issue",
      "target": "9"
    },
    {
      "label": "Override decision",
      "action": "force‑push",
      "target": "main"
    }
  ],
  "message": "Two competing proofs of the Accumulation Theorem are ready; please choose which to merge."
}
```

- **priority**: `suggested` | `required` | `intervention` | `critical`  
- **eta**: Expected time of impact if no action is taken.  
- **options**: A list of actionable choices the human can take directly from the notification.  

## Fleet‑Wide Alerts  
- Triggered when three or more agents are at Level 3 or higher, or any single agent reaches Level 4.  
- Alerts are broadcast to all integrated platforms with the prefix `[FLEET‑ALERT]`.  
- Include a summary dashboard link and immediate mitigation steps.  

## Platform Integration  
### Telegram  
- Webhook endpoint: `https://api.telegram.org/bot<TOKEN>/sendMessage`  
- Format: Markdown, with inline buttons for options when available.  

### Discord  
- Webhook endpoint: Discord channel webhook URL.  
- Format: Embed with fields for priority, agent, ETA, and options as reaction‑based choices.  

### Slack  
- Webhook endpoint: Slack app incoming webhook.  
- Format: Block kit with section, context, and button elements.  

### GitHub  
- Creates an issue with label `attention‑required` and mentions the assigned human.  
- Updates the issue with new comments as the situation evolves.  

## Implementation Notes  
- Notifications are idempotent; duplicate alerts within a 5‑minute window are suppressed.  
- All notifications are logged in `logs/notifications/` for audit.  
- The system respects “do not disturb” windows configured in `.agent/config/notifications.json`.  

## Example Flow  
1. Agent Flux encounters an ambiguous task.  
2. Flux sets status to Level 2 and writes an attention request.  
3. Notification is sent to Slack.  
4. After 4 hours with no response, escalation moves the alert to Telegram.  
5. Human selects an option via Telegram button; the agent