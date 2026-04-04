/**
 * Senior Council system for git-agent coordination.
 * Motions are GitHub issues with label "council".
 * Votes are emoji reactions (+1/-1).
 * 
 * @module council
 */

import { Octokit } from '@octokit/rest';

interface Motion {
  id: number;
  title: string;
  body: string;
  author: string;
  createdAt: string;
  labels: string[];
  reactions: {
    '+1': number;
    '-1': number;
  };
}

interface VoteResult {
  motionId: number;
  votesFor: number;
  votesAgainst: number;
  consensusReached: boolean;
  threshold: number;
}

export class Council {
  private octokit: Octokit;
  private org: string;
  private repo: string;
  private consensusThreshold: number;

  constructor(octokit: Octokit, org: string, repo: string, consensusThreshold: number = 0.75) {
    this.octokit = octokit;
    this.org = org;
    this.repo = repo;
    this.consensusThreshold = consensusThreshold;
  }

  /**
   * Propose a new motion by creating a GitHub issue with label "council"
   */
  async proposeMotion(title: string, body: string, author: string): Promise<Motion> {
    try {
      const issue = await this.octokit.issues.create({
        owner: this.org,
        repo: this.repo,
        title,
        body: `${body}\n\n**Proposed by:** ${author}\n**Status:** Pending`,
        labels: ['council']
      });

      return {
        id: issue.data.number,
        title: issue.data.title,
        body: issue.data.body || '',
        author,
        createdAt: issue.data.created_at,
        labels: issue.data.labels.map(l => typeof l === 'string' ? l : l.name || ''),
        reactions: { '+1': 0, '-1': 0 }
      };
    } catch (error) {
      throw new Error(`Failed to propose motion: ${error}`);
    }
  }

  /**
   * Vote on a motion by adding a reaction (+1/-1)
   */
  async vote(motionId: number, voter: string, vote: '+1' | '-1'): Promise<void> {
    try {
      await this.octokit.reactions.createForIssue({
        owner: this.org,
        repo: this.repo,
        issue_number: motionId,
        content: vote
      });
    } catch (error) {
      throw new Error(`Failed to vote on motion ${motionId}: ${error}`);
    }
  }

  /**
   * Check current vote status and consensus
   */
  async checkConsensus(motionId: number): Promise<VoteResult> {
    try {
      const reactions = await this.octokit.reactions.listForIssue({
        owner: this.org,
        repo: this.repo,
        issue_number: motionId
      });

      let votesFor = 0;
      let votesAgainst = 0;

      reactions.data.forEach(reaction => {
        if (reaction.content === '+1') votesFor++;
        if (reaction.content === '-1') votesAgainst++;
      });

      const totalVotes = votesFor + votesAgainst;
      const consensusReached = totalVotes > 0 && 
        (votesFor / totalVotes) >= this.consensusThreshold;

      return {
        motionId,
        votesFor,
        votesAgainst,
        consensusReached,
        threshold: this.consensusThreshold
      };
    } catch (error) {
      throw new Error(`Failed to check consensus for motion ${motionId}: ${error}`);
    }
  }

  /**
   * Execute a motion that has reached consensus
   * Updates issue status and performs the approved action
   */
  async executeMotion(motionId: number, executor: string): Promise<void> {
    try {
      const consensus = await this.checkConsensus(motionId);
      
      if (!consensus.consensusReached) {
        throw new Error(`Motion ${motionId} has not reached consensus`);
      }

      // Update issue to mark as executed
      await this.octokit.issues.update({
        owner: this.org,
        repo: this.repo,
        issue_number: motionId,
        state: 'closed',
        body: await this.getUpdatedBody(motionId, executor)
      });

      // Log execution
      console.log(`Motion ${motionId} executed by ${executor}`);
      
    } catch (error) {
      throw new Error(`Failed to execute motion