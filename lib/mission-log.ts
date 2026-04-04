// mission-log.ts
// Captain's log: permanent record of every heartbeat for Admiral review
// Implements Starfleet Stardate convention for timestamping

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface LogEntry {
  stardate: string;
  timestamp: string;
  action: string;
  reasoning: string;
  strategistAdvice?: string;
  outcome?: string;
  commitHash?: string;
}

interface MissionLogConfig {
  logFilePath: string;
  maxEntries: number;
  includeStrategist: boolean;
}

export class MissionLog {
  private config: MissionLogConfig;
  private logEntries: LogEntry[] = [];

  constructor(config?: Partial<MissionLogConfig>) {
    this.config = {
      logFilePath: join(process.cwd(), 'docs', 'mission-log.md'),
      maxEntries: 1000,
      includeStrategist: true,
      ...config
    };
    this.loadExistingLog();
  }

  private getStardate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const dayOfYear = Math.floor((now.getTime() - new Date(year, 0, 0).getTime()) / 86400000);
    const millisToday = now.getHours() * 3600000 + now.getMinutes() * 60000 + now.getSeconds() * 1000 + now.getMilliseconds();
    const fraction = millisToday / 86400000;
    
    // Star Trek TNG stardate format: YYYY.DD
    return `${year}.${String(dayOfYear + fraction).padStart(6, '0').substring(0, 6)}`;
  }

  private getCurrentCommitHash(): string {
    try {
      return execSync('git rev-parse --short HEAD').toString().trim();
    } catch {
      return 'unknown';
    }
  }

  private loadExistingLog(): void {
    if (!existsSync(this.config.logFilePath)) {
      return;
    }

    try {
      const content = readFileSync(this.config.logFilePath, 'utf8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('## Stardate')) {
          const stardate = lines[i].replace('## Stardate ', '').trim();
          const timestampLine = lines[i + 1];
          const actionLine = lines[i + 2];
          const reasoningLine = lines[i + 3];
          const strategistLine = lines[i + 4];
          const outcomeLine = lines[i + 5];
          const commitLine = lines[i + 6];

          if (timestampLine && actionLine && reasoningLine) {
            const entry: LogEntry = {
              stardate,
              timestamp: timestampLine.replace('**Timestamp:** ', '').trim(),
              action: actionLine.replace('**Action:** ', '').trim(),
              reasoning: reasoningLine.replace('**Reasoning:** ', '').trim(),
              outcome: outcomeLine?.replace('**Outcome:** ', '').trim(),
              commitHash: commitLine?.replace('**Commit:** ', '').trim()
            };

            if (strategistLine && strategistLine.startsWith('**Strategist:**')) {
              entry.strategistAdvice = strategistLine.replace('**Strategist:** ', '').trim();
            }

            this.logEntries.push(entry);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load existing mission log:', error);
    }
  }

  public recordHeartbeat(
    action: string,
    reasoning: string,
    strategistAdvice?: string,
    outcome?: string
  ): void {
    const entry: LogEntry = {
      stardate: this.getStardate(),
      timestamp: new Date().toISOString(),
      action,
      reasoning,
      strategistAdvice: this.config.includeStrategist ? strategistAdvice : undefined,
      outcome,
      commitHash: this.getCurrentCommitHash()
    };

    this.logEntries.unshift(entry); // Most recent first
    
    // Trim to max entries
    if (this.logEntries.length > this.config.maxEntries) {
      this.logEntries = this.logEntries.slice(0, this.config.maxEntries);
    }

    this.writeLogToFile();
  }

  private writeLogToFile(): void {
    let content = `# Captain's Mission Log\n\n`;
    content += `*"Captain