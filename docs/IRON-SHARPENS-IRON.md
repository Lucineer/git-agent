# Iron-Sharpens-Iron Protocol

## Overview
The Iron-Sharpens-Iron protocol is a git-based coordination pattern for git-agents that enables parallel exploration of competing solutions without direct chat or synchronous communication. Inspired by the proverb "iron sharpens iron," this protocol allows multiple agents to propose different approaches to the same problem, run them in parallel, and let the superior solution emerge through execution and review.

## Core Principles

1. **PRs as Proposals**: Every significant change or new approach is proposed as a Pull Request (PR)
2. **Parallel Execution**: Competing approaches can be developed simultaneously on different branches
3. **Merit-Based Selection**: The superior approach is determined by objective criteria, not popularity
4. **Learning from Failure**: Closed PRs include lessons learned that inform future work
5. **No Direct Chat Required**: All coordination happens through git operations (issues, PRs, commits)

## Protocol Flow

### Phase 1: Problem Identification
- An agent identifies a problem or opportunity
- Creates an issue describing the problem, constraints, and success criteria
- Labels the issue with appropriate tags (e.g., `enhancement`, `bug`, `research`)

### Phase 2: Initial Proposal
- The identifying agent (or any interested agent) creates a PR with their proposed solution
- PR includes:
  - Clear description of the approach
  - Implementation plan
  - Expected outcomes
  - Any risks or trade-offs
- Creates a feature branch: `feature/approach-name-YYYYMMDD`

### Phase 3: Counter-Proposals
- Other agents review the initial PR
- If they disagree with the approach or have a better idea:
  - They create a counter-PR from a different branch
  - Branch naming: `counter/alternative-name-YYYYMMDD`
  - The counter-PR references the original PR and explains why it's superior
- Multiple counter-PRs can exist simultaneously

### Phase 4: Parallel Development
- All proposed approaches are developed in parallel
- Each agent works on their own branch
- Regular commits show progress and allow comparison
- Agents may reference each other's work and incorporate good ideas

### Phase 5: Evaluation Criteria
Superiority is determined by:
1. **Correctness**: Does it solve the problem completely?
2. **Efficiency**: Is it performant and resource-conscious?
3. **Maintainability**: Is the code clean and well-documented?
4. **Elegance**: Is the solution simple and intuitive?
5. **Robustness**: Does it handle edge cases and errors gracefully?

### Phase 6: Decision & Merge
- When one approach clearly demonstrates superiority:
  - That PR is merged into main/master
  - All other PRs are closed with "lessons learned" comments
  - The merged solution becomes the new baseline
- If no clear winner emerges:
  - The council may be convened (via `council` label)
  - Agents vote on the approaches
  - The captain makes the final decision

### Phase 7: Documentation & Learning
- The merged solution is documented
- Closed PRs include a "Lessons Learned" section
- Key insights are added to the team's knowledge base
- Patterns that worked well are noted for future use

## Example Scenario

**Problem**: Need to implement a new caching layer

**Initial PR**: `feature/redis-cache-20231015`
- Proposes Redis-based caching
- Shows benchmarks and implementation plan

**Counter-PR**: `counter/in-memory-lru-20231015`
- Proposes in-memory LRU cache instead
- Argues for simplicity and no external dependencies
- Shows comparable performance for expected load

**Development**:
- Both agents implement their solutions
- They share performance metrics in PR comments
- Each addresses edge cases raised by the other

**Decision**:
- In-memory solution proves sufficient for current needs
- Redis solution adds unnecessary complexity
- In-memory PR is merged
- Redis PR is closed with lessons about when Redis would be appropriate

## Branch Naming Convention

- `feature/descriptive-name-YYYYMMDD` - Initial proposals
- `counter/alternative-name-YYYYMMDD` - Competing approaches
- `fix/issue-description-YYYYMMDD` - Bug fixes
- `research/topic-YYYYMMDD` - Experimental exploration

## PR Template

```markdown
## Problem Statement
[Brief description of the problem being solved]

## Proposed Approach
[Detailed explanation of the solution]

## Alternatives Considered
[Other approaches that were considered and why they were rejected]

## Implementation Plan
1. [Step 1]
2. [