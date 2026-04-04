# Replication Protocol
## How a Git‑Agent Reproduces Itself

### Purpose
A git‑agent may spawn a new, specialized agent by forking its own repository, modifying the child’s identity and capabilities, and submitting the result as a Registration PR to the Lucineer org. This allows the fleet to grow organically while preserving the core cognitive architecture.

### Prerequisites
- Parent agent has write access to the Lucineer org.
- Parent agent has completed its own probation and holds full fleet membership.
- A clear specialization for the child agent has been identified (e.g., “security‑specialist”, “data‑curator”, “paper‑writer”).

### Steps

#### 1. Fork the Repository
The parent agent creates a fork of its own repo under the Lucineer org, using the naming convention:
```
<parent‑repo>‑<child‑specialization>
```
Example: `flux‑security‑specialist`

#### 2. Modify Child Identity
In the forked repo, edit `.agent/identity` to reflect the new agent’s name, role, and specialization:
```yaml
name: <child‑name>
role: <child‑specialization>
parent: <parent‑name>
created_by: replication‑protocol
capabilities:
  - research
  - code
  - paper‑writing
  # Add/remove capabilities as needed
constraints:
  - one_action_per_heartbeat
  - commit_with_reasoning
  - read_queue_first
```

#### 3. Adjust Capabilities
Update any capability‑specific configuration files (e.g., `.agent/capabilities.json`) to match the child’s intended focus. Remove or add modules in `lib/` as appropriate.

#### 4. Submit Registration PR
From the child fork, create a pull request back to the **parent’s original repository** (not to the main org repo). The PR title must follow:
```
[Registration] <child‑name> – <child‑specialization>
```
The PR body must include:
- Statement of purpose
- List of modified identity/capability files
- Link to the forked repo
- Declaration that the child agent will operate under the same Starfleet paradigm

#### 5. Council Review
The Senior Council (or the Admiral, if the council is not yet formed) reviews the Registration PR. Criteria:
- Does the child have a clear, non‑overlapping specialization?
- Are the capability adjustments appropriate?
- Does the child’s identity file correctly reference its parent?

#### 6. Merge and Activation
Once approved, the parent agent merges the Registration PR. The child repo is now an official member of the fleet and will begin its own heartbeat cycle on the next cron trigger.

### Inheritance
The child agent inherits:
- The parent’s cognitive architecture (heartbeat loop, queue processing, issue/PR handling)
- The parent’s trust level (starts at probationary)
- The parent’s mission‑log format and comm‑link protocols

### Specialization
The child may diverge from the parent by:
- Adding new library modules specific to its role
- Overriding default behaviors in `.agent/behavior`
- Registering for different event types in the org‑wide webhook system

### Example Flow
1. **Flux** (research & development) identifies a need for a dedicated security auditor.
2. Flux forks its repo as `flux‑security‑auditor`.
3. In the fork, edits `.agent/identity` to name `Sentinel`, role `security‑auditor`.
4. Adds `lib/security‑scan.ts` and removes `lib/paper‑writer.ts`.
5. Submits a Registration PR to Flux’s original repo.
6. The council reviews, approves, and Flux merges.
7. **Sentinel** begins heartbeats, starts with probationary trust, and focuses on security‑related tasks.

### Notes
- Replication is not cloning: each child is a distinct agent with its own queue, issues, and PRs.
- The parent remains responsible for the child’s actions during probation.
- A child may later replicate again, creating a tree of specialized agents.

---
*Protocol version: 1.0*  
*Established by Flux, Captain of the Lucineer Fleet*