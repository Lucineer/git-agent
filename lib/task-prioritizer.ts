// Task Prioritizer for git-agent Flux
// Implements intelligent scoring and ordering of tasks in .agent/next

export interface Task {
  id: string;
  content: string;
  createdAt: Date;
  lastTouched?: Date;
  metadata?: {
    urgency?: number; // 0-10
    strategicAlignment?: number; // 0-10
    dependencies?: string[]; // IDs of prerequisite tasks
    estimatedEffort?: number; // in minutes
    source?: 'queue' | 'issue' | 'pr' | 'human';
  };
}

export interface PrioritizationConfig {
  weights: {
    urgency: number;
    strategicAlignment: number;
    dependencies: number;
    effort: number;
    staleness: number;
  };
  stalenessThreshold: number; // hours
  maxQueueLength: number;
}

const DEFAULT_CONFIG: PrioritizationConfig = {
  weights: {
    urgency: 0.3,
    strategicAlignment: 0.25,
    dependencies: 0.2,
    effort: 0.15,
    staleness: 0.1,
  },
  stalenessThreshold: 24, // hours
  maxQueueLength: 20,
};

export function scoreTask(task: Task, config: PrioritizationConfig = DEFAULT_CONFIG): number {
  let score = 0;
  
  // Urgency (higher = better)
  const urgency = task.metadata?.urgency ?? 5;
  score += (urgency / 10) * config.weights.urgency;
  
  // Strategic alignment (higher = better)
  const alignment = task.metadata?.strategicAlignment ?? 5;
  score += (alignment / 10) * config.weights.strategicAlignment;
  
  // Dependencies (fewer = better)
  const deps = task.metadata?.dependencies?.length ?? 0;
  const depScore = deps === 0 ? 1 : 1 / (deps + 1);
  score += depScore * config.weights.dependencies;
  
  // Effort (lower = better, but not zero)
  const effort = task.metadata?.estimatedEffort ?? 60;
  const effortScore = effort > 0 ? 1 / Math.log(effort + 1) : 0.5;
  score += effortScore * config.weights.effort;
  
  // Staleness (older = slightly better, but not too old)
  const now = new Date();
  const ageHours = (now.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60);
  const stalenessScore = ageHours > config.stalenessThreshold ? 
    1.2 : // Boost slightly stale tasks
    Math.min(1, ageHours / config.stalenessThreshold);
  score += stalenessScore * config.weights.staleness;
  
  return Math.round(score * 100) / 100;
}

export function prioritizeQueue(tasks: Task[], config: PrioritizationConfig = DEFAULT_CONFIG): Task[] {
  if (tasks.length === 0) return [];
  
  // Score all tasks
  const scored = tasks.map(task => ({
    task,
    score: scoreTask(task, config),
  }));
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  // Apply queue length limit
  const limited = scored.slice(0, config.maxQueueLength);
  
  return limited.map(item => item.task);
}

export function detectStalledTasks(tasks: Task[], config: PrioritizationConfig = DEFAULT_CONFIG): Task[] {
  const now = new Date();
  const thresholdMs = config.stalenessThreshold * 60 * 60 * 1000;
  
  return tasks.filter(task => {
    const lastTouched = task.lastTouched || task.createdAt;
    const ageMs = now.getTime() - lastTouched.getTime();
    return ageMs > thresholdMs;
  });
}

export function parseQueueContent(content: string): Task[] {
  const lines = content.trim().split('\n');
  const tasks: Task[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple parsing: first line is the task content
    // In a real implementation, we'd parse metadata from comments
    const task: Task = {
      id: `task-${Date.now()}-${i}`,
      content: line,
      createdAt: new Date(),
      metadata: {
        source: 'queue',
        estimatedEffort: