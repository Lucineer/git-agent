// Vessel Status Assessment & Notification Routing
// Implements the VESSEL-COMMAND-PROTOCOL notification levels and escalation rules

export enum VesselStatus {
    ALL_CLEAR = 'all-clear',      // All done, awaiting orders
    ATTENTION = 'attention',      // Queue empty but issues open
    EXECUTING = 'executing',      // Active work in progress
    ALERT = 'alert'               // Lost communication, stuck, or error
}

export enum NotificationTarget {
    ADMIRAL = 'admiral',          // Repository owner (Picard)
    COUNCIL = 'council',          // Senior Council of agents
    FLEET = 'fleet'               // All agents in the org
}

export interface StatusReport {
    timestamp: Date;
    agentId: string;
    status: VesselStatus;
    currentTask: string | null;
    queueLength: number;
    openIssues: number;
    openPRs: number;
    lastHeartbeat: Date;
    message: string;
    requiresHumanAttention: boolean;
}

export class VesselStatusSystem {
    private agentId: string;
    private lastHeartbeat: Date;

    constructor(agentId: string) {
        this.agentId = agentId;
        this.lastHeartbeat = new Date();
    }

    updateHeartbeat(): void {
        this.lastHeartbeat = new Date();
    }

    async assessStatus(): Promise<StatusReport> {
        // Read current state
        const queue = await this.readQueue();
        const issues = await this.countOpenIssues();
        const prs = await this.countOpenPRs();
        const currentTask = await this.getCurrentTask();

        // Determine status level
        let status: VesselStatus;
        let message = '';
        let requiresHumanAttention = false;

        if (queue.length === 0 && issues === 0 && prs === 0) {
            status = VesselStatus.ALL_CLEAR;
            message = 'All tasks completed. Awaiting orders.';
        } else if (queue.length === 0 && (issues > 0 || prs > 0)) {
            status = VesselStatus.ATTENTION;
            message = `Queue empty but ${issues} issue(s) and ${prs} PR(s) require attention.`;
        } else if (queue.length > 0) {
            status = VesselStatus.EXECUTING;
            message = `Executing: ${currentTask || 'processing queue'}`;
        } else {
            status = VesselStatus.ALERT;
            message = 'Unexpected state detected. System may be stuck.';
            requiresHumanAttention = true;
        }

        // Check for heartbeat timeout (5 minutes)
        const now = new Date();
        const heartbeatAge = now.getTime() - this.lastHeartbeat.getTime();
        if (heartbeatAge > 5 * 60 * 1000) {
            status = VesselStatus.ALERT;
            message = `Heartbeat timeout: ${Math.floor(heartbeatAge / 1000)} seconds since last update.`;
            requiresHumanAttention = true;
        }

        return {
            timestamp: now,
            agentId: this.agentId,
            status,
            currentTask,
            queueLength: queue.length,
            openIssues: issues,
            openPRs: prs,
            lastHeartbeat: this.lastHeartbeat,
            message,
            requiresHumanAttention
        };
    }

    async notifyAdmiral(report: StatusReport): Promise<void> {
        const formatted = this.formatStatusReport(report);
        
        // In production, this would create an issue or send a notification
        // For now, we'll log to console and create a status file
        console.log(`[NOTIFY ADMIRAL] ${formatted}`);
        
        // Create a status file for other agents to read
        const fs = require('fs');
        fs.writeFileSync(
            `.agent/status-${this.agentId}.json`,
            JSON.stringify(report, null, 2)
        );
        
        if (report.requiresHumanAttention) {
            await this.createHumanAttentionIssue(report);
        }
    }

    async escalateToCouncil(report: StatusReport): Promise<void> {
        if (report.status === VesselStatus.ALERT || report.requiresHumanAttention) {
            const formatted = this.formatStatusReport(report);
            console.log(`[ESCALATE TO COUNCIL] ${formatted}`);
            
            // Create a council motion for urgent attention
            // This would interface with the council.ts system
            const council = require