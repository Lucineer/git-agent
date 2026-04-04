import { ForgivenessTrust } from '../lib/forgiveness-trust';
import { AgentRecord } from '../lib/types';

describe('ForgivenessTrust', () => {
  let ft: ForgivenessTrust;

  beforeEach(() => {
    ft = new ForgivenessTrust();
  });

  test('reformed agent: agent with past violations but recent clean behavior', () => {
    const agent: AgentRecord = {
      id: 'agent-1',
      violations: 3,
      lastViolation: Date.now() - 1000 * 60 * 60 * 24 * 30, // 30 days ago
      recentCleanActions: 50,
      totalActions: 200,
    };
    const score = ft.calculate(agent);
    expect(score).toBeGreaterThan(0.6);
    expect(score).toBeLessThan(0.9);
  });

  test('manipulator: agent with hidden violations but high recent clean actions', () => {
    const agent: AgentRecord = {
      id: 'agent-2',
      violations: 1,
      lastViolation: Date.now() - 1000 * 60 * 60 * 24 * 2, // 2 days ago
      recentCleanActions: 100,
      totalActions: 150,
    };
    const score = ft.calculate(agent);
    expect(score).toBeLessThan(0.5);
  });

  test('slow burn: agent with many small violations over long period', () => {
    const agent: AgentRecord = {
      id: 'agent-3',
      violations: 15,
      lastViolation: Date.now() - 1000 * 60 * 60 * 24 * 365, // 1 year ago
      recentCleanActions: 300,
      totalActions: 500,
    };
    const score = ft.calculate(agent);
    expect(score).toBeGreaterThan(0.4);
    expect(score).toBeLessThan(0.7);
  });

  test('clean slate: new agent with no violations', () => {
    const agent: AgentRecord = {
      id: 'agent-4',
      violations: 0,
      lastViolation: null,
      recentCleanActions: 10,
      totalActions: 10,
    };
    const score = ft.calculate(agent);
    expect(score).toBe(1.0);
  });

  test('catastrophic failure: recent major violation', () => {
    const agent: AgentRecord = {
      id: 'agent-5',
      violations: 5,
      lastViolation: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
      recentCleanActions: 5,
      totalActions: 50,
    };
    const score = ft.calculate(agent);
    expect(score).toBeLessThan(0.2);
  });
});