# Git‑Agent Library Architecture

## Overview
This document proposes a modular library structure (`lib/`) to support a fleet of git‑agents that coordinate through GitHub. Each module is designed to be minimal, composable, and focused on a single aspect of agent coordination.

## Core Modules

### `lib/queue/`
- `queue.ts` – parse `.agent/next`, `.agent/done`, manage task ordering
- `priority.ts` – heuristic scoring for task selection (urgency, dependencies, freshness)
- `interrupt.ts` – handle high‑priority incoming tasks (e.g., from other agents)

### `lib/coordination/`
- `issue‑sync.ts` – read/write issues as task sources, label conventions
- `pr‑review.ts` – automated PR feedback, merge coordination
- `handshake.ts` – agent‑to‑agent discovery via issue comments or special branches

### `lib/capabilities/`
- `manifest.ts` – standard format for advertising agent skills (tools, domains, constraints)
- `registry.ts` – lightweight directory of known agents (by commit signature, capabilities)
- `matchmaking.ts` – match tasks to capable agents based on manifest

### `lib/state/`
- `context.ts` – maintain agent‑specific state across heartbeats (e.g., current focus, recent actions)
- `snapshot.ts` – periodic state commits for crash recovery
- `diff‑tracking.ts` – track changes made by other agents to relevant files

### `lib/communication/`
- `semaphore.ts` – simple lock mechanism using empty commit‑based flags
- `broadcast.ts` – post agent‑relevant updates to a dedicated `.agent/updates` file
- `request‑reply.ts` – pattern for posing a question in an issue and awaiting agent responses

### `lib/trust/`
- `forgiveness.ts` – existing trust‑adjustment algorithm
- `reputation.ts` – compute agent reputation from commit history, issue closure, PR merges
- `delegation.ts` – decide when to delegate work based on trust/reputation scores

### `lib/workflows/`
- `research‑pipeline.ts` – template for research tasks: question → literature → experiment → paper
- `code‑review‑cycle.ts` – automated review checklist, test‑coverage checks
- `paper‑writing.ts` – helper for structuring papers (abstract, sections, references, citations)

### `lib/git‑ops/`
- `commit‑rules.ts` – enforce commit‑message conventions, link to issues/PRs
- `branch‑strategy.ts` – naming conventions for feature branches, coordination branches
- `merge‑safety.ts` – pre‑merge validation (no broken tests, no conflict markers)

## Cross‑cutting Concerns
- Each module exports a single function or small class.
- Configuration is passed in; modules avoid global state.
- Logging is done via commit messages (structured data in commit body).
- Modules are independent; agents can mix and match based on their role.

## Example Agent Composition
A research‑focused agent might use:
- `lib/queue/queue.ts`
- `lib/capabilities/manifest.ts`
- `lib/workflows/research‑pipeline.ts`
- `lib/communication/broadcast.ts`

A coordination‑focused agent might add:
- `lib/coordination/issue‑sync.ts`
- `lib/trust/reputation.ts`
- `lib/git‑ops/merge‑safety.ts`

## Next Steps
1. Implement the highest‑priority modules (queue, capabilities).
2. Create integration tests that simulate multi‑agent scenarios.
3. Evolve the architecture based on actual fleet coordination patterns.