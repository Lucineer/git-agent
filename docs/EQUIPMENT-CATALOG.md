# Equipment Catalog: Standard Capability Format

## Purpose
The Equipment Catalog provides a standardized format for describing agent capabilities, tools, and resources within the Lucineer git-agent ecosystem. This enables:
- **Discovery**: Agents can find and understand available capabilities.
- **Composition**: Agents can combine capabilities to solve complex tasks.
- **Verification**: Capabilities can be cryptographically attested via Merkle-trust DAGs.
- **Coordination**: Agents can delegate tasks based on capability metadata.

## Format Specification

### Core Fields
Each capability entry is a JSON object with the following required fields:

```json
{
  "id": "unique-kebab-case-identifier",
  "version": "semantic-version",
  "type": "tool|library|service|dataset|model",
  "name": "Human-readable name",
  "description": "Clear summary of what this capability does.",
  "provider": "agent-id or org",
  "attestation": "merkle-root-or-signature",
  "created": "ISO-8601-timestamp",
  "updated": "ISO-8601-timestamp"
}
```

### Extended Metadata
Optional fields for richer description:

```json
{
  "inputs": [
    {
      "name": "parameter-name",
      "type": "string|number|boolean|object|array",
      "description": "What this input expects.",
      "required": true
    }
  ],
  "outputs": [
    {
      "name": "output-name",
      "type": "string|number|boolean|object|array",
      "description": "What this output provides."
    }
  ],
  "dependencies": ["capability-id-1", "capability-id-2"],
  "tags": ["category1", "category2"],
  "location": "git-repo-path-or-url",
  "examples": ["example usage snippet"],
  "limits": {
    "rate": "calls-per-minute",
    "concurrency": "max-parallel-instances"
  }
}
```

### Example Entry
```json
{
  "id": "merkle-trust-dag",
  "version": "1.0.0",
  "type": "library",
  "name": "Merkle Trust DAG",
  "description": "Cryptographic trust tracking across git commits using hash-linked directed acyclic graphs.",
  "provider": "flux",
  "attestation": "sha256:abc123...",
  "created": "2025-01-15T10:30:00Z",
  "updated": "2025-01-15T10:30:00Z",
  "inputs": [
    {
      "name": "commit-hash",
      "type": "string",
      "description": "Git commit SHA to anchor trust chain",
      "required": true
    }
  ],
  "outputs": [
    {
      "name": "trust-proof",
      "type": "object",
      "description": "Merkle path proving inclusion in trust DAG"
    }
  ],
  "dependencies": ["git-core"],
  "tags": ["cryptography", "trust", "coordination"],
  "location": "lib/merkle-trust.ts"
}
```

## Catalog Structure
The catalog is maintained as a directory of JSON files:

```
equipment/
├── capabilities/
│   ├── merkle-trust-dag.json
│   ├── dead-reckoning.json
│   └── ...
├── agents/
│   ├── flux.json
│   └── ...
└── index.json  # Aggregated index of all capabilities
```

## Usage Patterns

### Agent Self-Registration
When an agent creates a new capability, it should:
1. Implement the capability in code
2. Create a capability JSON file in `equipment/capabilities/`
3. Update the agent's own entry in `equipment/agents/`
4. Commit with Merkle-trust attestation

### Capability Discovery
Agents can:
- Scan the equipment directory for relevant capabilities
- Query by type, tags, or dependencies
- Verify attestations against the trust DAG

### Task Delegation
When an agent encounters a task requiring capabilities it lacks:
1. Search equipment catalog for matching capabilities
2. Verify provider attestations
3. Delegate subtask to capable agent via issue/PR
4. Reference capability IDs in coordination messages

## Integration with Merkle Trust
Each capability entry includes an `attestation` field linking to the Merkle-trust DAG. This allows:
- Verification that the capability was created by a trusted agent
- Audit