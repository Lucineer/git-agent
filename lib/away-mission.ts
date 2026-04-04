// away-mission.ts
// Implements the Picard away mission pattern: when the human is offline,
// the captain takes full command.

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ADMIRAL_STATUS_FILE = '.agent/admiral-status.json';
const CAPTAIN_LOG_FILE = 'docs/mission-log.md';

interface AdmiralStatus {
  online: boolean;
  lastSeen: string; // ISO timestamp
  expectedReturn?: string; // ISO timestamp if known
}

interface CaptainCommandLog {
  timestamp: string;
  action: string;
  reasoning: string;
  outcome?: string;
}

/**
 * Tracks whether the Admiral (human) is online.
 * Checks for recent activity in the repo as a proxy.
 */
export function trackAdmiralStatus(): AdmiralStatus {
  const now = new Date().toISOString();
  try {
    // Check for recent commits by the human (Lucineer org)
    const recent = execSync(
      'git log --oneline -10 --author="Lucineer" --format="%H %at"',
      { encoding: 'utf-8' }
    ).trim();
    const lines = recent.split('\n').filter(l => l);
    const lastCommitTime = lines.length > 0 ? parseInt(lines[0].split(' ')[1]) * 1000 : 0;
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

    const online = lastCommitTime > twentyFourHoursAgo;
    const status: AdmiralStatus = {
      online,
      lastSeen: new Date(lastCommitTime).toISOString(),
    };

    writeFileSync(ADMIRAL_STATUS_FILE, JSON.stringify(status, null, 2));
    return status;
  } catch (error) {
    // Fallback status if git check fails
    const status: AdmiralStatus = {
      online: false,
      lastSeen: now,
    };
    writeFileSync(ADMIRAL_STATUS_FILE, JSON.stringify(status, null, 2));
    return status;
  }
}

/**
 * Assumes command when Admiral is offline.
 * Returns true if command is assumed, false otherwise.
 */
export function assumeCommand(): boolean {
  const status = trackAdmiralStatus();
  if (status.online) {
    console.log('Admiral is online. Standing by.');
    return false;
  }

  console.log('Admiral is offline. Captain assuming command.');
  // Log the assumption
  const logEntry: CaptainCommandLog = {
    timestamp: new Date().toISOString(),
    action: 'ASSUME_COMMAND',
    reasoning: 'Admiral offline per trackAdmiralStatus(). Captain taking full command.',
  };
  appendCaptainLog(logEntry);
  return true;
}

/**
 * Prepares a briefing for the Admiral upon return.
 * Summarizes actions taken while they were away.
 */
export function prepareBriefing(): string {
  if (!existsSync(CAPTAIN_LOG_FILE)) {
    return 'No captain log found. No actions taken while away.';
  }

  const logContent = readFileSync(CAPTAIN_LOG_FILE, 'utf-8');
  const lines = logContent.split('\n');
  const recentEntries = lines.filter(line => line.includes('ASSUME_COMMAND') || line.includes('ACTION:')).slice(-20);

  const status = trackAdmiralStatus();
  const briefing = `
# CAPTAIN'S BRIEFING
Admiral last seen: ${status.lastSeen}
Current status: ${status.online ? 'ONLINE' : 'OFFLINE'}

## Recent Actions Under Captain's Command
${recentEntries.map(e => `- ${e}`).join('\n')}

## Full log available in ${CAPTAIN_LOG_FILE}
  `.trim();

  const briefingFile = 'docs/captain-briefing.md';
  writeFileSync(briefingFile, briefing);
  return briefing;
}

/**
 * Reports to the Admiral upon their return.
 * Calls prepareBriefing and logs the report.
 */
export function reportOnReturn(): void {
  const status = trackAdmiralStatus();
  if (!status.online) {
    console.log('Admiral still offline. No report generated.');
    return;
  }

  console.log('Admiral has returned. Preparing report.');
  const briefing = prepareBriefing();
  const logEntry: CaptainCommandLog = {
    timestamp: new Date().toISOString(),
    action: 'REPORT_ON_RETURN',
    reasoning: '