import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface ArenaConfig {
  branchA: string;
  branchB: string;
  testCommand: string;
  evaluationMetric: (outputA: string, outputB: string) => number;
  mergeTarget: string;
}

export class ParallelArena {
  constructor(private repoPath: string) {}

  createArena(config: ArenaConfig): void {
    // Create branch A
    execSync(`git checkout -b ${config.branchA}`, { cwd: this.repoPath });
    // For now, we'll assume the competing code is already present in the working directory
    // In practice, we'd stage and commit it here.
    execSync(`git add .`, { cwd: this.repoPath });
    execSync(`git commit -m "arena: initial commit for ${config.branchA}"`, { cwd: this.repoPath });

    // Create branch B
    execSync(`git checkout main`, { cwd: this.repoPath });
    execSync(`git checkout -b ${config.branchB}`, { cwd: this.repoPath });
    execSync(`git add .`, { cwd: this.repoPath });
    execSync(`git commit -m "arena: initial commit for ${config.branchB}"`, { cwd: this.repoPath });

    console.log(`Arena created: ${config.branchA} vs ${config.branchB}`);
  }

  runCompeting(branchA: string, branchB: string, testCommand: string): { outputA: string; outputB: string } {
    let outputA = '';
    let outputB = '';

    try {
      execSync(`git checkout ${branchA}`, { cwd: this.repoPath });
      outputA = execSync(testCommand, { cwd: this.repoPath, encoding: 'utf-8' });
    } catch (e: any) {
      outputA = `ERROR: ${e.message}`;
    }

    try {
      execSync(`git checkout ${branchB}`, { cwd: this.repoPath });
      outputB = execSync(testCommand, { cwd: this.repoPath, encoding: 'utf-8' });
    } catch (e: any) {
      outputB = `ERROR: ${e.message}`;
    }

    return { outputA, outputB };
  }

  evaluateResults(outputA: string, outputB: string, metric: (a: string, b: string) => number): number {
    return metric(outputA, outputB);
  }

  mergeWinner(winnerBranch: string, targetBranch: string): void {
    execSync(`git checkout ${targetBranch}`, { cwd: this.repoPath });
    execSync(`git merge --no-ff ${winnerBranch} -m "arena: merge winner ${winnerBranch}"`, { cwd: this.repoPath });
    console.log(`Merged ${winnerBranch} into ${targetBranch}`);
  }

  archiveLoser(loserBranch: string): void {
    // Tag the loser branch for historical reference
    const tagName = `arena/loser-${loserBranch}-${Date.now()}`;
    execSync(`git tag ${tagName} ${loserBranch}`, { cwd: this.repoPath });
    execSync(`git branch -D ${loserBranch}`, { cwd: this.repoPath });
    console.log(`Archived ${loserBranch} with tag ${tagName}`);
  }

  async runArena(config: ArenaConfig): Promise<string> {
    this.createArena(config);
    const { outputA, outputB } = this.runCompeting(config.branchA, config.branchB, config.testCommand);
    const score = this.evaluateResults(outputA, outputB, config.evaluationMetric);
    const winner = score >= 0 ? config.branchA : config.branchB;
    const loser = winner === config.branchA ? config.branchB : config.branchA;

    this.mergeWinner(winner, config.mergeTarget);
    this.archiveLoser(loser);

    return winner;
  }
}

// Example metric: simple string length (for illustration)
export function exampleMetric(outputA: string, outputB: string): number {
  return outputA.length - outputB.length;
}