```typescript
/**
 * Iron‑Sharpens‑Iron Arena
 * 
 * When two competing approaches exist, create two branches,
 * run both in parallel, evaluate results, merge the winner,
 * archive the loser.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface ArenaConfig {
  branchA: string;
  branchB: string;
  testCommand: string;
  evaluationMetric: 'speed' | 'accuracy' | 'memory' | 'score';
  higherIsBetter: boolean;
  timeoutMs?: number;
}

export interface ArenaResult {
  winner: string | null;
  loser: string | null;
  scores: { [branch: string]: number };
  logs: { [branch: string]: string };
  merged: boolean;
  error?: string;
}

/**
 * Create two branches for competing implementations.
 */
export function createArena(baseBranch: string, config: ArenaConfig): void {
  // Ensure we start from the base branch
  execSync(`git checkout ${baseBranch}`, { stdio: 'inherit' });
  
  // Create branch A
  execSync(`git checkout -b ${config.branchA}`, { stdio: 'inherit' });
  // Branch B is created by switching back and branching off base
  execSync(`git checkout ${baseBranch}`, { stdio: 'inherit' });
  execSync(`git checkout -b ${config.branchB}`, { stdio: 'inherit' });
  
  console.log(`Arena created: ${config.branchA} vs ${config.branchB}`);
}

/**
 * Run the competing branches and collect results.
 */
export function runCompeting(config: ArenaConfig): ArenaResult {
  const scores: { [branch: string]: number } = {};
  const logs: { [branch: string]: string } = {};
  let winner: string | null = null;
  let loser: string | null = null;
  
  const branches = [config.branchA, config.branchB];
  
  for (const branch of branches) {
    try {
      execSync(`git checkout ${branch}`, { stdio: 'pipe' });
      
      const start = Date.now();
      const output = execSync(config.testCommand, {
        timeout: config.timeoutMs || 30000,
        encoding: 'utf-8',
      });
      const duration = Date.now() - start;
      
      logs[branch] = output;
      
      // Parse score from output (simplistic; in practice use regex or structured output)
      let score = 0;
      if (config.evaluationMetric === 'speed') {
        score = -duration; // lower duration is better
      } else if (config.evaluationMetric === 'accuracy') {
        const match = output.match(/accuracy[:=]\s*([0-9.]+)/);
        score = match ? parseFloat(match[1]) : 0;
      } else if (config.evaluationMetric === 'memory') {
        const match = output.match(/memory[:=]\s*([0-9.]+)/);
        score = match ? -parseFloat(match[1]) : 0; // lower memory is better
      } else {
        // generic score extraction
        const match = output.match(/score[:=]\s*([0-9.]+)/);
        score = match ? parseFloat(match[1]) : 0;
      }
      
      scores[branch] = score;
    } catch (error: any) {
      logs[branch] = `Error: ${error.message}`;
      scores[branch] = config.higherIsBetter ? -Infinity : Infinity;
    }
  }
  
  // Determine winner
  if (scores[config.branchA] !== undefined && scores[config.branchB] !== undefined) {
    if (config.higherIsBetter) {
      if (scores[config.branchA] > scores[config.branchB]) {
        winner = config.branchA;
        loser = config.branchB;
      } else if (scores[config.branchB] > scores[config.branchA]) {
        winner = config.branchB;
        loser = config.branchA;
      }
    } else {
      if (scores[config.branchA] < scores[config.branchB]) {
        winner = config.branchA;
        loser = config.branchB;
      } else if (scores[config.branchB] < scores[config.branchA]) {
        winner = config.branchB;
        loser = config.branchA;
      }