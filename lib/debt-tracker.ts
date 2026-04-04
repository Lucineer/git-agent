```typescript
/**
 * Developmental Debt Tracker
 * 
 * Implements debt management for git-agents:
 * - Record shortcuts taken during development
 * - Calculate debt score based on impact and urgency
 * - Prioritize paydown tasks
 * - Generate debt reports for vessel status
 * 
 * Debt items are tracked as GitHub issues with label "tech-debt"
 */

export interface DebtItem {
  id: string;
  title: string;
  description: string;
  shortcutType: 'temporary' | 'expedient' | 'compromise';
  impact: 'low' | 'medium' | 'high' | 'critical';
  urgency: 'low' | 'medium' | 'high' | 'immediate';
  createdAt: Date;
  estimatedPaydownTime: number; // in heartbeats
  relatedFiles: string[];
  debtScore: number;
}

export class DebtTracker {
  private debtItems: Map<string, DebtItem> = new Map();
  
  /**
   * Record a shortcut taken during development
   */
  recordShortcut(
    title: string,
    description: string,
    shortcutType: DebtItem['shortcutType'],
    impact: DebtItem['impact'],
    urgency: DebtItem['urgency'],
    estimatedPaydownTime: number,
    relatedFiles: string[] = []
  ): DebtItem {
    const id = `debt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const debtScore = this.calculateDebtScore(impact, urgency, estimatedPaydownTime);
    
    const debtItem: DebtItem = {
      id,
      title,
      description,
      shortcutType,
      impact,
      urgency,
      createdAt: new Date(),
      estimatedPaydownTime,
      relatedFiles,
      debtScore
    };
    
    this.debtItems.set(id, debtItem);
    this.syncToIssues(debtItem);
    
    return debtItem;
  }
  
  /**
   * Calculate debt score based on impact, urgency, and paydown time
   */
  private calculateDebtScore(
    impact: DebtItem['impact'],
    urgency: DebtItem['urgency'],
    paydownTime: number
  ): number {
    const impactWeights = {
      low: 1,
      medium: 2,
      high: 4,
      critical: 8
    };
    
    const urgencyWeights = {
      low: 1,
      medium: 1.5,
      high: 2.5,
      immediate: 4
    };
    
    const timeMultiplier = Math.log10(paydownTime + 1) + 1;
    
    return impactWeights[impact] * urgencyWeights[urgency] * timeMultiplier;
  }
  
  /**
   * Prioritize debt items for paydown
   */
  prioritizePaydown(): DebtItem[] {
    const items = Array.from(this.debtItems.values());
    
    return items.sort((a, b) => {
      // Primary sort by debt score (descending)
      if (b.debtScore !== a.debtScore) {
        return b.debtScore - a.debtScore;
      }
      
      // Secondary sort by urgency
      const urgencyOrder = { immediate: 4, high: 3, medium: 2, low: 1 };
      if (urgencyOrder[b.urgency] !== urgencyOrder[a.urgency]) {
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      }
      
      // Tertiary sort by creation date (oldest first)
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }
  
  /**
   * Generate a debt report for vessel status
   */
  generateDebtReport(): {
    summary: {
      totalItems: number;
      totalDebtScore: number;
      averageDebtScore: number;
      criticalItems: number;
      highImpactItems: number;
    };
    prioritizedItems: DebtItem[];
    recommendations: string[];
  } {
    const items = Array.from(this.debtItems.values());
    const totalDebtScore = items.reduce((sum, item) => sum + item.debtScore, 0);
    const criticalItems = items.filter(item => item.impact === 'critical').length;
    const highImpactItems = items.filter(item => item.impact === 'high').length;
    
    const recommendations: string[] = [];
    
    if (criticalItems > 0) {
      recommendations.push(`Address ${criticalItems} critical debt item(s) immediately`);
    }
    
    if (totalDebtScore > 100) {
      recommendations.push('Deb