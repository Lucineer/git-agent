# Fleet Metrics Dashboard

## Overview
The Fleet Metrics Dashboard provides real‑time visibility into the health, performance, and coordination of the git‑agent fleet. Metrics are collected by each agent and aggregated for fleet‑wide analysis.

## Core Metrics

### 1. Heartbeats per Hour (HPH)
- **Definition**: Number of agent heartbeats recorded per hour across the fleet.
- **Purpose**: Measures overall fleet activity and liveliness.
- **Target**: Stable baseline with spikes during coordinated missions.

### 2. Tasks Completed
- **Definition**: Count of tasks marked `done` per agent and fleet‑wide.
- **Purpose**: Tracks productivity and mission progress.
- **Granularity**: By agent, by formation, by priority.

### 3. Strategist Hit Rate
- **Definition**: Percentage of strategist (Kimi K2.5) recommendations that lead to successful outcomes (e.g., PR merged, issue resolved, consensus reached).
- **Purpose**: Evaluates the quality of strategic guidance.
- **Calculation**: `(successful_strategist_actions / total_strategist_actions) * 100`

### 4. Trust Score Trends
- **Definition**: Rolling average of trust scores derived from peer reviews, PR acceptance rates, and mission success.
- **Purpose**: Indicates reliability and coordination health.
- **Update**: After each formation mission or peer review cycle.

### 5. Queue Depth
- **Definition**: Number of pending tasks in `.agent/next` across all agents.
- **Purpose**: Identifies bottlenecks and overload.
- **Alert**: Queue depth > 10 per agent triggers load‑balancing review.

### 6. Fleet Size
- **Definition**: Count of active git‑agents in the org.
- **Purpose**: Tracks growth and agent lifecycle (spawned/retired).

### 7. Self‑Initiated Actions vs Queued
- **Definition**: Ratio of actions taken from an empty queue (self‑initiated) vs actions taken from the top of `.agent/next`.
- **Purpose**: Measures autonomy and initiative.
- **Healthy range**: 20‑40% self‑initiated.

### 8. Error Rate
- **Definition**: Percentage of actions that result in a rollback, conflict, or failure state.
- **Purpose**: Signals stability and code quality.
- **Alert**: Error rate > 5% over a 24‑hour window.

### 9. Response Time Distribution
- **Definition**: Histogram of time between task dequeue and completion.
- **Purpose**: Identifies performance outliers and latency issues.
- **Percentiles**: P50, P90, P99.

## Dashboard Views

### Fleet‑at‑a‑Glance
- Real‑time HPH, fleet size, queue depth, error rate.
- Top 5 agents by tasks completed.
- Recent anomalies.

### Agent Detail
- Individual heartbeat timeline.
- Task completion history.
- Trust score over time.
- Current queue.

### Formation Performance
- Metrics aggregated per formation (away team).
- Mission duration vs outcomes.
- Strategist hit rate per formation.

### Historical Trends
- 7‑day rolling averages.
- Correlation between strategist hit rate and trust scores.
- Fleet growth trajectory.

## Data Collection
- Each agent records its own metrics via `lib/metrics‑collector.ts`.
- Metrics are stored as JSON in `fleet/metrics.json` with timestamp and agent ID.
- Aggregation is performed by a scheduled fleet‑wide job (to be implemented).

## Anomaly Detection
- **Sudden drop in HPH**: Possible agent failure or GitHub outage.
- **Spike in error rate**: Recent changes may have introduced instability.
- **Queue depth imbalance**: Some agents overloaded; consider load‑balancing.
- **Trust score divergence**: May indicate coordination breakdown.

## Operational Responses
- **Yellow alert**: Any metric outside baseline for > 1 hour.
- **Red alert**: Multiple metrics anomalous or error rate > 10%.
- **Response**: Initiate formation to investigate, roll back suspect changes, redistribute queue.

---
*Dashboard design follows Starfleet principles: clear, actionable, real‑time. “The needs of the many outweigh the needs of the few.” — Spock*