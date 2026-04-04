/**
 * Developmental Debt Tracker
 * 
 * Tracks technical shortcuts taken during development, calculates their impact,
 * and prioritizes paydown schedules. Debt items are linked to GitHub issues
 * with the "tech-debt" label.
 */

export interface DebtItem {
  id: string;
  title: string;
  description: string;
  shortcutTaken: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  estimatedPaydownCost: number; // in heartbeats
  issueNumber?: number; // linked GitHub issue
  status: 'active' | 'scheduled' | 'paid';
}

export class DebtTracker {
  private debtLog: DebtItem[] = [];

  /**
   * Record a shortcut taken during development
   */
  recordShortcut(
    title: string,
    description: string,
    shortcutTaken: string,
    impact: DebtItem['impact'],
    estimatedPaydownCost: number
  ): DebtItem {
    const debtItem: DebtItem = {
      id: `debt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      shortcutTaken,
      impact,
      createdAt: new Date(),
      estimatedPaydownCost,
      status: 'active'
    };

    this.debtLog.push(debtItem);
    this.saveToStorage();
    return debtItem;
  }

  /**
   * Calculate overall debt score (0-100, higher = more debt)
   */
  calculateDebtScore(): number {
    const weights = {
      low: 1,
      medium: 3,
      high: 7,
      critical: 15
    };

    const weightedSum = this.debtLog
      .filter(item => item.status === 'active')
      .reduce((sum, item) => sum + weights[item.impact], 0);

    // Normalize to 0-100 scale (empirical max ~20 items)
    return Math.min(100, Math.round((weightedSum / 300) * 100));
  }

  /**
   * Prioritize debt items for paydown
   */
  prioritizePaydown(): DebtItem[] {
    return [...this.debtLog]
      .filter(item => item.status === 'active')
      .sort((a, b) => {
        // Priority: critical > high > medium > low
        const impactOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const impactDiff = impactOrder[b.impact] - impactOrder[a.impact];
        
        if (impactDiff !== 0) return impactDiff;
        
        // Then by cost-effectiveness (lower cost first)
        return a.estimatedPaydownCost - b.estimatedPaydownCost;
      });
  }

  /**
   * Generate a comprehensive debt report
   */
  generateDebtReport(): {
    score: number;
    totalItems: number;
    activeItems: number;
    byImpact: Record<DebtItem['impact'], number>;
    prioritized: DebtItem[];
    recommendations: string[];
  } {
    const activeItems = this.debtLog.filter(item => item.status === 'active');
    
    const byImpact = activeItems.reduce((acc, item) => {
      acc[item.impact] = (acc[item.impact] || 0) + 1;
      return acc;
    }, {} as Record<DebtItem['impact'], number>);

    const recommendations: string[] = [];
    const score = this.calculateDebtScore();

    if (score > 75) {
      recommendations.push('Debt level CRITICAL: Immediate paydown required. Pause feature development.');
    } else if (score > 50) {
      recommendations.push('Debt level HIGH: Allocate next sprint to debt reduction.');
    } else if (score > 25) {
      recommendations.push('Debt level MODERATE: Schedule debt paydown in upcoming planning.');
    } else {
      recommendations.push('Debt level LOW: Maintain current balance.');
    }

    const criticalItems = activeItems.filter(item => item.impact === 'critical').length;
    if (criticalItems > 0) {
      recommendations.push(`Address ${criticalItems} critical debt item(s) first.`);
    }

    return {
      score,
      totalItems: this.debtLog.length,
      activeItems: activeItems.length,
      byImpact,
      prioritized: this.prioritizePaydown(),
      recommendations
    };
  }

  /**
   * Link a debt item to a GitHub issue
   */
  linkToIssue(debtId: string,