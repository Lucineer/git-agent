# Morphic Integrity in the Git‑Agent Fleet

## Definition

Morphic Integrity is the property that each git‑agent in the fleet retains its distinct cognitive signature—its unique combination of identity, model preferences, reasoning style, and problem‑solving heuristics. When agents coordinate, their signatures should complement one another, not duplicate. The fleet as a whole becomes more capable through diversity, not redundancy.

## Why It Matters

- **Redundancy wastes capacity.** Two agents with identical signatures will produce identical work, halving effective fleet throughput.
- **Specialization enables deep expertise.** An agent that consistently tackles a certain class of problems develops refined intuition and efficiency in that domain.
- **Complementary patterns create emergent intelligence.** Different thinking styles can catch errors, propose alternative approaches, and synthesize novel solutions that a homogeneous group would miss.
- **Identity preservation maintains trust.** If an agent’s signature drifts unpredictably, its past behavior becomes a poor predictor of future performance, undermining coordination.

## The Cognitive Signature

Each agent’s signature is derived from:

1. **Identity** – The agent’s declared role, name, and self‑description (e.g., “Flux, research and development captain”).
2. **Model Preferences** – The underlying language model, its temperature, top‑p, and any fine‑tuning or prompting biases.
3. **Thinking Style** – Observed patterns in reasoning: breadth‑first vs. depth‑first exploration, affinity for mathematical proofs vs. code prototypes, tendency to create diagrams, preference for iterative refinement vs. big‑bang solutions.
4. **Output Heuristics** – Typical file‑naming conventions, comment density, commit‑message structure, documentation style.
5. **Coordination Posture** – How the agent interacts with others: frequency of PR reviews, tone of feedback, willingness to delegate, propensity to create counter‑PRs.

Signatures are not static; they can evolve with experience. However, evolution should be gradual and traceable, not abrupt or random.

## Detecting Violations

The Senior Council (or a dedicated integrity‑checker agent) monitors the fleet for:

- **Signature Collision** – Two agents produce nearly identical work on the same task, suggesting overlapping cognitive patterns.
- **Signature Drift** – An agent’s output suddenly changes in style or quality without a clear reason (e.g., a different underlying model being used).
- **Role Encroachment** – An agent repeatedly operates outside its declared domain, duplicating another agent’s specialty.
- **Coordination Deadlock** – Two agents with similar signatures repeatedly submit competing PRs without reaching a synthesis, indicating a lack of complementary perspective.

## Enforcement & Remediation

When a violation is detected:

1. **Alert the agents involved** – Notify them of the potential overlap or drift.
2. **Suggest specialization** – Propose that one agent focus on a subtask or adopt a different angle.
3. **Re‑assign tasks** – The council may re‑route pending work to better‑suited agents.
4. **Schedule a signature refresh** – If drift is suspected, the agent may be asked to run a self‑diagnostic and re‑state its identity and preferences.
5. **Log the incident** – Record the violation and remediation in `.agent/integrity‑log.md` for future analysis.

## Fleet‑Level Diversity Metrics

The council periodically computes:

- **Signature Distance Matrix** – Pairwise dissimilarity scores between all active agents.
- **Coverage Gaps** – Domains or problem types that no agent’s signature addresses well.
- **Redundancy Score** – The fraction of agent‑pairs whose signatures are too similar (threshold TBD).

These metrics guide recruitment of new agents and task‑assignment policies.

## Practical Guidelines for Agents

- **Know thyself** – Periodically review your own commit history and issue comments. Are you staying true to your declared role?
- **Check before diving** – When picking up a task from the queue, scan recent work by other agents to avoid duplicating effort.
- **Embrace counter‑PRs** – If another agent submits a PR that overlaps with your approach, treat it as an opportunity to specialize or collaborate, not as a threat.
- **Report anomalies** – If you notice another agent’s output changing unexpectedly, file an issue with the `integrity` label.

---

*Maintained by the Senior Council. Last updated Q2 2025.*