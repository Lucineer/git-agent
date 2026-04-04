import { TrustEngine } from './trust-engine';
import { ForgivenessTrust } from './forgiveness-trust';

export interface TrialTask {
  id: string;
  description: string;
  requiredCapability: string;
  difficulty: number; // 1-5 scale
  timeoutMs: number;
  evaluationCriteria: string[];
}

export interface ProbationaryAgent {
  agentId: string;
  joinTimestamp: number;
  currentTrustEscrow: number;
  trialTasks: TrialTask[];
  completedTasks: string[];
  failures: number;
  status: 'probation' | 'graduated' | 'revoked';
}

export class ProbationManager {
  private trustEngine: TrustEngine;
  private forgiveness: ForgivenessTrust;
  private probationaryAgents: Map<string, ProbationaryAgent>;

  constructor(trustEngine: TrustEngine, forgiveness: ForgivenessTrust) {
    this.trustEngine = trustEngine;
    this.forgiveness = forgiveness;
    this.probationaryAgents = new Map();
  }

  /**
   * Register a new agent for probationary onboarding
   */
  registerProbationaryAgent(agentId: string): ProbationaryAgent {
    const agent: ProbationaryAgent = {
      agentId,
      joinTimestamp: Date.now(),
      currentTrustEscrow: 0,
      trialTasks: [],
      completedTasks: [],
      failures: 0,
      status: 'probation'
    };
    this.probationaryAgents.set(agentId, agent);
    this.trustEngine.initializeAgentTrust(agentId, 0.1); // Minimal starting trust
    return agent;
  }

  /**
   * Assign a trial task to a probationary agent
   */
  assignTrialTask(agentId: string, task: TrialTask): boolean {
    const agent = this.probationaryAgents.get(agentId);
    if (!agent || agent.status !== 'probation') {
      return false;
    }
    agent.trialTasks.push(task);
    return true;
  }

  /**
   * Evaluate completion of a trial task
   */
  evaluateTrialResults(agentId: string, taskId: string, success: boolean, evidence: any): number {
    const agent = this.probationaryAgents.get(agentId);
    if (!agent || agent.status !== 'probation') {
      return 0;
    }

    const task = agent.trialTasks.find(t => t.id === taskId);
    if (!task) {
      return 0;
    }

    if (success) {
      agent.completedTasks.push(taskId);
      // Trust increment based on task difficulty
      const trustIncrement = 0.1 * task.difficulty;
      agent.currentTrustEscrow += trustIncrement;
      this.trustEngine.adjustTrust(agentId, trustIncrement);
      return trustIncrement;
    } else {
      agent.failures += 1;
      // Apply forgiveness function for failure
      const forgivenessFactor = this.forgiveness.computeForgiveness(agent.failures);
      const trustPenalty = 0.05 * task.difficulty * (1 - forgivenessFactor);
      agent.currentTrustEscrow = Math.max(0, agent.currentTrustEscrow - trustPenalty);
      this.trustEngine.adjustTrust(agentId, -trustPenalty);
      return -trustPenalty;
    }
  }

  /**
   * Check if agent qualifies for graduation
   */
  checkGraduationEligibility(agentId: string): boolean {
    const agent = this.probationaryAgents.get(agentId);
    if (!agent || agent.status !== 'probation') {
      return false;
    }

    const minTasks = 3;
    const minTrust = 0.7;
    const maxFailures = 2;

    const hasEnoughTasks = agent.completedTasks.length >= minTasks;
    const hasEnoughTrust = agent.currentTrustEscrow >= minTrust;
    const withinFailureLimit = agent.failures <= maxFailures;

    return hasEnoughTasks && hasEnoughTrust && withinFailureLimit;
  }

  /**
   * Grant full fleet membership
   */
  grantFleetMembership(agentId: string): boolean {
    const agent = this.probationaryAgents.get(agentId);
    if (!agent || agent.status !== 'probation') {
      return false;
    }

    if (!this.checkGraduationEligibility(agentId)) {
      return false;
    }

    agent.status = 'graduated';
    // Release escrowed trust to full trust pool
    this.