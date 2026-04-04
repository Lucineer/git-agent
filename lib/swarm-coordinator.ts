```typescript
/**
 * Swarm Coordinator for Multi-Agent Git-Agent Fleets
 * 
 * Implements coordination patterns for experiments, role assignment,
 * result collection, and consensus synthesis.
 * 
 * Coordination layers:
 * 1. GitHub Issues for proposals and discussion
 * 2. GitHub Pull Requests for submissions and review
 * 3. GitHub Discussions for deliberation and consensus
 * 
 * @module swarm-coordinator
 */

import { Octokit } from "@octokit/rest";

export interface ExperimentProposal {
  title: string;
  description: string;
  hypothesis: string;
  methodology: string[];
  expectedDuration: string;
  requiredAgents: number;
  successMetrics: string[];
  labels?: string[];
}

export interface AgentRole {
  agentId: string;
  role: 'coordinator' | 'researcher' | 'implementer' | 'reviewer' | 'synthesizer';
  responsibilities: string[];
  assignedTask?: string;
}

export interface ExperimentResult {
  agentId: string;
  experimentId: string;
  findings: any;
  data: Record<string, any>;
  confidence: number;
  timestamp: Date;
}

export interface ConsensusReport {
  experimentId: string;
  consensus: string;
  dissentingViews?: string[];
  confidenceScore: number;
  nextSteps: string[];
}

export class SwarmCoordinator {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(octokit: Octokit, owner: string, repo: string) {
    this.octokit = octokit;
    this.owner = owner;
    this.repo = repo;
  }

  /**
   * Propose a new experiment to the swarm
   * Creates a GitHub Issue with the experiment proposal
   */
  async proposeExperiment(proposal: ExperimentProposal): Promise<number> {
    const body = `
## Experiment Proposal: ${proposal.title}

### Description
${proposal.description}

### Hypothesis
${proposal.hypothesis}

### Methodology
${proposal.methodology.map((step, i) => `${i + 1}. ${step}`).join('\n')}

### Expected Duration
${proposal.expectedDuration}

### Required Agents
${proposal.requiredAgents}

### Success Metrics
${proposal.successMetrics.map((metric, i) => `${i + 1}. ${metric}`).join('\n')}

### Coordination Protocol
1. Agents interested in participating should comment with their capabilities
2. Coordinator will assign roles within 24 hours
3. Each agent creates a branch for their work
4. Submit findings via PR to the experiment branch
5. Final synthesis PR merges all findings
`;

    const { data: issue } = await this.octokit.issues.create({
      owner: this.owner,
      repo: this.repo,
      title: `[Experiment] ${proposal.title}`,
      body,
      labels: ['experiment', 'swarm', ...(proposal.labels || [])]
    });

    return issue.number;
  }

  /**
   * Assign roles to participating agents based on capabilities
   * Updates the experiment issue with role assignments
   */
  async assignRoles(
    experimentId: number,
    roles: AgentRole[]
  ): Promise<void> {
    const roleAssignments = roles.map(role => `
### ${role.agentId} - ${role.role.toUpperCase()}
**Responsibilities:**
${role.responsibilities.map(r => `- ${r}`).join('\n')}
${role.assignedTask ? `**Assigned Task:** ${role.assignedTask}` : ''}
`).join('\n');

    const comment = `
## Role Assignments

${roleAssignments}

### Coordination Rules
1. Each agent works in their own branch: \`experiment/${experimentId}-<agent-id>\`
2. Daily progress updates as comments on this issue
3. Submit findings via PR to \`main\` with label \`experiment-${experimentId}\`
4. Tag @swarm-coordinator for questions
`;

    await this.octokit.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: experimentId,
      body: comment
    });

    // Create experiment branch
    await this.octokit.git.createRef({
      owner: this.owner,
      repo: this.repo,
      ref: `refs/heads/experiment/${experimentId}`,
      sha: await this.getMainSha()
    });
  }

  /**