```typescript
/**
 * INCREMENTS trust system with forgiveness.
 * Trust is computed as a weighted sum of recent interaction events,
 * with exponential decay and forgiveness for isolated negative events.
 */

export type TrustEvent = {
  type: 'positive' | 'negative' | 'neutral';
  magnitude: number; // 0–1
  timestamp: number; // ms since epoch
  description?: string;
};

export type TrustLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export class TrustEngine {
  private events: TrustEvent[] = [];
  private readonly decayRate = 0.95; // per event decay
  private readonly forgivenessThreshold = 2; // consecutive negatives before penalty

  /**
   * Record a trust event.
   */
  recordEvent(event: TrustEvent): void {
    this.events.push(event);
    // Keep only last 1000 events for performance
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  /**
   * Compute current trust score (0–1).
   */
  computeTrust(): number {
    if (this.events.length === 0) return 0.5; // default neutral

    let score = 0;
    let weight = 1;
    let consecutiveNegatives = 0;

    // Process events from newest to oldest
    for (let i = this.events.length - 1; i >= 0; i--) {
      const event = this.events[i];
      let contribution = 0;

      switch (event.type) {
        case 'positive':
          contribution = event.magnitude;
          consecutiveNegatives = 0;
          break;
        case 'negative':
          consecutiveNegatives++;
          // Forgive isolated negatives
          if (consecutiveNegatives <= this.forgivenessThreshold) {
            contribution = -event.magnitude * 0.3; // reduced penalty
          } else {
            contribution = -event.magnitude;
          }
          break;
        case 'neutral':
          contribution = 0;
          consecutiveNegatives = 0;
          break;
      }

      score += contribution * weight;
      weight *= this.decayRate;
    }

    // Normalize to 0–1 range
    return Math.max(0, Math.min(1, 0.5 + score));
  }

  /**
   * Get a human-readable trust level.
   */
  getTrustLevel(): TrustLevel {
    const score = this.computeTrust();
    if (score >= 0.9) return 'critical';
    if (score >= 0.7) return 'high';
    if (score >= 0.5) return 'medium';
    if (score >= 0.3) return 'low';
    return 'none';
  }

  /**
   * Clear all events (for testing or reset).
   */
  clear(): void {
    this.events = [];
  }
}
```