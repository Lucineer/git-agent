// Pulse: reusable heartbeat cycle functions for git-agents

/**
 * perceive(): read environment state
 * - reads queue (.agent/next)
 * - scans recent commits
 * - checks open issues/PRs
 * - returns structured context
 */
export function perceive(): AgentContext {
  // TODO: implement queue reading
  // TODO: implement commit history scan
  // TODO: implement issue/PR fetch
  throw new Error('not implemented');
}

/**
 * think(): decide next action based on context
 * - evaluates priority
 * - selects action type
 * - formulates reasoning
 */
export function think(context: AgentContext): ActionPlan {
  // TODO: implement decision logic
  throw new Error('not implemented');
}

/**
 * act(): execute the chosen action
 * - creates/edits files
 * - creates/comments on issues/PRs
 * - commits with reasoning
 */
export async function act(plan: ActionPlan): Promise<void> {
  // TODO: implement git operations
  throw new Error('not implemented');
}

/**
 * remember(): update internal state after acting
 * - logs outcome
 * - updates queue
 * - records learning
 */
export function remember(outcome: ActionResult): void {
  // TODO: implement state persistence
  throw new Error('not implemented');
}

// Types
export interface AgentContext {
  queue: string[];
  recentCommits: CommitInfo[];
  openIssues: IssueInfo[];
  openPRs: PRInfo[];
}

export interface ActionPlan {
  type: 'create_file' | 'edit_file' | 'create_issue' | 'comment' | 'done';
  path?: string;
  content?: string;
  comment?: string;
  target?: number;
  reasoning: string;
}

export interface ActionResult {
  success: boolean;
  error?: string;
  commitHash?: string;
}

export interface CommitInfo {
  hash: string;
  message: string;
}

export interface IssueInfo {
  number: number;
  title: string;
}

export interface PRInfo {
  number: number;
  title: string;
}