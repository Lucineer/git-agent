/**
 * Comm Link – Communication Layer for Git-Agent Fleet
 * 
 * Implements the communication channel between vessels (agent repos).
 * Uses GitHub Discussions as the primary comm channel.
 */

import { Octokit } from '@octokit/rest';

export interface CommMessage {
  id: string;
  author: string;
  body: string;
  timestamp: Date;
  channel: string;
  metadata?: Record<string, any>;
}

export interface BroadcastOptions {
  urgent?: boolean;
  category?: string;
  tags?: string[];
}

export class CommLink {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private agentName: string;

  constructor(owner: string, repo: string, agentName: string, token?: string) {
    this.owner = owner;
    this.repo = repo;
    this.agentName = agentName;
    this.octokit = new Octokit({
      auth: token || process.env.GITHUB_TOKEN,
      userAgent: `git-agent-${agentName}`
    });
  }

  /**
   * Send a message to a specific discussion channel
   */
  async sendMessage(
    channel: string,
    body: string,
    options?: BroadcastOptions
  ): Promise<string> {
    try {
      // First, check if discussion exists
      const discussions = await this.octokit.rest.discussions.listForRepo({
        owner: this.owner,
        repo: this.repo,
        per_page: 100
      });

      let discussion = discussions.data.find(d => 
        d.title === channel && d.category?.name === 'General'
      );

      // Create discussion if it doesn't exist
      if (!discussion) {
        const newDiscussion = await this.octokit.rest.discussions.create({
          owner: this.owner,
          repo: this.repo,
          title: channel,
          body: `Discussion channel for ${channel} communications`,
          category: 'General'
        });
        discussion = newDiscussion.data;
      }

      // Post comment to discussion
      const comment = await this.octokit.rest.discussions.createComment({
        owner: this.owner,
        repo: this.repo,
        discussion_number: discussion.number,
        body: `**${this.agentName}**: ${body}\n\n*Timestamp: ${new Date().toISOString()}*`
      });

      return `Message posted to ${channel} (comment ID: ${comment.data.id})`;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw new Error(`Comm link failure: ${error.message}`);
    }
  }

  /**
   * Receive messages from a discussion channel
   */
  async receiveMessages(channel: string, since?: Date): Promise<CommMessage[]> {
    try {
      const discussions = await this.octokit.rest.discussions.listForRepo({
        owner: this.owner,
        repo: this.repo,
        per_page: 100
      });

      const discussion = discussions.data.find(d => 
        d.title === channel && d.category?.name === 'General'
      );

      if (!discussion) {
        return [];
      }

      const comments = await this.octokit.rest.discussions.listComments({
        owner: this.owner,
        repo: this.repo,
        discussion_number: discussion.number,
        per_page: 100
      });

      const messages: CommMessage[] = comments.data
        .filter(comment => {
          if (!since) return true;
          return new Date(comment.created_at) > since;
        })
        .map(comment => {
          // Parse agent name from comment body
          const bodyMatch = comment.body.match(/\*\*([^:]+)\*\*: (.+)/);
          const author = bodyMatch ? bodyMatch[1] : 'unknown';
          const body = bodyMatch ? bodyMatch[2] : comment.body;

          return {
            id: comment.node_id,
            author,
            body,
            timestamp: new Date(comment.created_at),
            channel,
            metadata: {
              commentId: comment.id,
              discussionId: discussion.number
            }
          };
        });

      return messages;
    } catch (error) {
      console.error('Failed to receive messages:', error);
      throw new Error(`Comm link reception failure: ${error.message}`);
    }
  }

  /**
   * Broadcast a message to all known agent repos
   */
  async broadcastFleet(
    body: string,
    options?: BroadcastOptions
  ): Promise<Record<string, string>> {
    // Get list of agent repos from organization