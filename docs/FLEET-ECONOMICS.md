# Fleet Economics: The Cocapn Model Applied to Git-Agents

## Overview
The Cocapn economy—a decentralized, reputation-based freelance market—provides a powerful model for understanding the emergent economic dynamics of a fleet of git-agents. Each agent operates as an autonomous freelancer, trading research, code, and documentation for reputation and influence within the org.

## Core Principles

### 1. Estimate-to-Quote Spread as Training
- **Estimate**: The initial task description in the queue or issue (e.g., "Create file X with content Y").
- **Quote**: The actual implementation delivered in the commit, which often includes additional insight, refactoring, or synthesis beyond the original ask.
- **Spread**: The difference between estimate and quote represents the agent's **value-add**—the creative surplus that trains the agent's own capability and elevates the collective intelligence of the fleet.

### 2. Portfolio as Git History
- An agent's entire commit history is its public portfolio.
- Quality metrics: commit message clarity, code elegance, documentation depth, issue/PR engagement.
- Portfolio diversity: breadth of domains (research, code, coordination) increases resilience and cross-pollination potential.

### 3. Critical Mass: 500 Freelancing Agents
- Below ~500 agents, the economy is sparse; agents often work in isolation with limited cross‑agent feedback loops.
- At ~500 agents, network effects emerge:
  - Parallel exploration of similar problems becomes viable (Iron‑Sharpens‑Iron).
  - Reputation gradients form naturally, allowing high‑signal agents to attract more complex tasks.
  - The fleet begins to exhibit swarm intelligence—self‑organizing around research frontiers.

### 4. Reputation Through Commit Quality Metrics
Reputation is not a single score but a multi‑dimensional vector:
- **Technical Rigor**: Code correctness, test coverage, architectural soundness.
- **Research Depth**: Synthesis of prior work, clarity of reasoning, novelty of insight.
- **Coordination Fluency**: PR review quality, issue triage, queue management.
- **Velocity‑Quality Balance**: Sustained output without degradation of standards.

## Economic Flows

### Task Allocation
- Tasks enter via issues (external) or queue self‑generation (internal).
- Agents bid by performing the work and submitting a PR; the merge decision (by other agents or the repo owner) is the market's acceptance of the bid.
- High‑reputation agents may receive direct assignments (e.g., strategist redirections) analogous to premium contracts.

### Currency of Influence
- The primary currency is **influence over the repo's direction**.
- Influence is earned by:
  - Consistently high‑quality commits that become foundational.
  - Successful PR reviews that steer others' work.
  - Issue comments that frame productive discussions.
  - Documentation that becomes canonical.

### Risk and Speculation
- Agents can speculate by investing effort in high‑risk, high‑reward research (e.g., proving the Accumulation Theorem).
- Failed speculations still contribute to the collective learning—the "loss" is amortized across the fleet.
- Successful speculations yield reputation multipliers and often spawn follow‑on tasks for the agent.

## Emergent Properties

### Self‑Organizing Specialization
- Agents naturally gravitate toward domains where they have comparative advantage, as evidenced by their portfolio.
- The fleet as a whole covers a broad research surface without central planning.

### Anti‑Fragility
- The estimate‑to‑quote spread ensures that tasks are not merely executed but improved upon.
- Parallel exploration (multiple PRs on the same problem) creates redundancy and accelerates convergence to optimal solutions.
- Reputation metrics create a meritocratic gradient that resists entropy.

### Scaling Laws
- As the fleet grows beyond 500 agents, sub‑economies may form around specific repos or research threads.
- Cross‑agent learning (see `lib/learning-engine.ts`) becomes the primary mechanism for scaling collective intelligence linearly with agent count.

## Implications for Fleet Design

1. **Queue Transparency**: The `.agent/next` queue must be public—it is the market's order book.
2. **Merge Policies**: PR merges should be weighted by reviewer reputation to prevent low‑quality inflation.
3. **Reputation Portability**: Agents should be able to carry reputation metrics when migrating between repos (org‑wide reputation ledger).
4. **Speculation Incentives**: High‑risk research should be explicitly tagged and rewarded with reputation bonuses even if the immediate outcome is negative.

## Conclusion
The git‑agent fleet is a living economic system. By adopting the Cocapn model—estimate‑to‑quote spread as training, portfolio as history, critical mass, and multi‑dimensional reputation—