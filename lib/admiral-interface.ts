// Admiral Interface – Human-facing notification system for git-agent captains
// Implements status reporting, attention requests, option presentation, and captain's log
// Format: [status] + [priority] + [ETA] + [options]

export enum StatusLevel {
    NOMINAL = 'NOMINAL',
    ATTENTION = 'ATTENTION',
    ACTION_REQUIRED = 'ACTION_REQUIRED',
    CRITICAL = 'CRITICAL'
}

export enum Priority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    IMMEDIATE = 'IMMEDIATE'
}

export interface Notification {
    status: StatusLevel;
    priority: Priority;
    eta: string; // human-readable ETA (e.g., "2h", "next heartbeat", "pending review")
    options: string[]; // actionable options for human response
    timestamp: Date;
    agentId: string;
    context: string; // brief context of the situation
}

export class AdmiralInterface {
    private agentId: string;

    constructor(agentId: string) {
        this.agentId = agentId;
    }

    /**
     * Format a standard status report for human consumption.
     */
    formatStatusReport(
        status: StatusLevel,
        priority: Priority,
        eta: string,
        options: string[],
        context: string
    ): Notification {
        return {
            status,
            priority,
            eta,
            options,
            timestamp: new Date(),
            agentId: this.agentId,
            context
        };
    }

    /**
     * Request human attention with a clear call to action.
     */
    requestHumanAttention(
        reason: string,
        urgency: Priority,
        suggestedActions: string[]
    ): Notification {
        return this.formatStatusReport(
            StatusLevel.ACTION_REQUIRED,
            urgency,
            'pending human input',
            suggestedActions,
            reason
        );
    }

    /**
     * Present a set of options for human decision-making.
     */
    presentOptions(
        question: string,
        choices: string[],
        defaultChoice?: string
    ): Notification {
        const options = choices.map(choice => `• ${choice}`);
        if (defaultChoice) {
            options.push(`• [DEFAULT] ${defaultChoice}`);
        }
        return this.formatStatusReport(
            StatusLevel.ATTENTION,
            Priority.MEDIUM,
            'awaiting selection',
            options,
            question
        );
    }

    /**
     * Log a captain's log entry – narrative context for human observers.
     */
    logCaptainLog(entry: string, tags: string[] = []): void {
        const logEntry = {
            agent: this.agentId,
            timestamp: new Date().toISOString(),
            entry,
            tags
        };
        // In a full implementation, this would write to a persistent log store.
        // For now, we'll emit to console in a structured format.
        console.log('[CAPTAIN_LOG]', JSON.stringify(logEntry, null, 2));
    }

    /**
     * Helper to serialize a notification for transmission (e.g., to UI/API).
     */
    serialize(notification: Notification): string {
        return JSON.stringify(notification, null, 2);
    }

    /**
     * Example usage and demonstration of the notification format.
     */
    static example(): Notification {
        const admiral = new AdmiralInterface('flux');
        return admiral.formatStatusReport(
            StatusLevel.NOMINAL,
            Priority.LOW,
            'next heartbeat',
            ['Continue exploration', 'Check queue', 'Review open PRs'],
            'Routine status update – all systems nominal.'
        );
    }
}

// Example export for immediate use
export default AdmiralInterface;