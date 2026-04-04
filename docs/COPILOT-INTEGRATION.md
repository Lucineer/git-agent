# Copilot Integration Protocol
> "LaForge in Engineering" — The agent delegates coding tasks to Copilot and reviews the output.

## Overview
Git‑agents can access GitHub Copilot via its API to obtain code suggestions, generate tests, refactor existing code, and review code quality. The agent acts as the commanding officer: it formulates the task, delegates to Copilot (the “engineer”), then critically reviews the output before committing or requesting revisions.

## Authentication
1. Obtain a GitHub Copilot API token with `copilot` scope.
2. Store the token in the agent’s environment as `COPILOT_API_TOKEN`.
3. Include the token in the `Authorization` header: `Bearer <token>`.

## API Endpoints
The primary endpoint is:
```
POST https://api.github.com/copilot/completions
```
with a JSON body specifying `prompt`, `max_tokens`, `temperature`, etc.

For chat‑style interactions (Copilot Chat), use:
```
POST https://api.github.com/copilot/chat/completions
```

## Workflow Pattern
1. **Task Formulation** – The agent creates a precise, context‑rich prompt including:
   - Relevant file snippets
   - Desired function signature
   - Constraints or requirements
   - Examples if available
2. **Delegate to Copilot** – The agent calls the Copilot API with the prompt.
3. **Review & Validate** – The agent examines the suggestion for:
   - Correctness against requirements
   - Security & best practices
   - Consistency with existing codebase
   - Readability and maintainability
4. **Iterate or Accept** – If the suggestion is deficient, the agent refines the prompt and re‑queries. If acceptable, the agent integrates the code (with any necessary adjustments) and commits.

## Example Prompt Template
```json
{
  "prompt": "// File: lib/quantum‑encoder.ts\n// Existing function: encodeQuantumState(state: Qubit[]): string\n// New requirement: Add error‑correction using Shor code\n// Constraints: Must be reversible; maintain < 5ms latency\n// Generate the function encodeWithShorCorrection(state: Qubit[]): string\n",
  "max_tokens": 500,
  "temperature": 0.2
}
```

## Safety & Oversight
- Copilot suggestions are **never** automatically trusted. The agent must review every line.
- The agent logs all prompts and responses for auditability.
- If Copilot repeatedly produces low‑quality output, the agent escalates to the Council (opens an issue) for manual intervention.

## Integration Bridge
See `lib/copilot‑bridge.ts` for the concrete implementation of this protocol.

## Metaphor
> **LaForge in Engineering** – Captain Riker (the agent) gives Chief Engineer LaForge (Copilot) a technical specification. LaForge returns a proposed solution. Riker inspects the work, asks for revisions if needed, and finally approves it for deployment.

This metaphor reinforces the agent’s role as the responsible commander, using Copilot as a powerful but subordinate tool.