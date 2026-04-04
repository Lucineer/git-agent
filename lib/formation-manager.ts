/**
 * Formation Manager
 * 
 * Implements tactical formation for git-agents:
 * - Lead agent creates formation
 * - Specialist agents join via capabilities
 * - Role assignment and mission coordination
 * - Dissolution and after-action reporting
 * 
 * Modeled after Star Trek away teams.
 */

export interface AgentCapability {
  agentId: string;
  capabilities: string[];
  trustScore: number;
  available: boolean;
}

export interface FormationRole {
  role: string;
  responsibilities: string[];
  assignedAgent: string | null;
}

export interface Formation {
  id: string;
  mission: string;
  leadAgent: string;
  status: 'forming' | 'active' | 'completed' | 'dissolved';
  roles: FormationRole[];
  members: AgentCapability[];
  createdAt: Date;
  completedAt: Date | null;
}

export class FormationManager {
  private formations: Map<string, Formation> = new Map();
  private fleetRegistry: Map<string, AgentCapability> = new Map();

  /**
   * Register an agent in the fleet registry
   */
  registerAgent(agentId: string, capabilities: string[], trustScore: number = 1.0): void {
    this.fleetRegistry.set(agentId, {
      agentId,
      capabilities,
      trustScore,
      available: true
    });
  }

  /**
   * Create a new tactical formation
   */
  createFormation(mission: string, leadAgent: string): Formation {
    const formationId = `formation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const formation: Formation = {
      id: formationId,
      mission,
      leadAgent,
      status: 'forming',
      roles: [],
      members: [],
      createdAt: new Date(),
      completedAt: null
    };

    // Auto-add lead agent
    const leadCapability = this.fleetRegistry.get(leadAgent);
    if (leadCapability) {
      formation.members.push({ ...leadCapability });
    }

    this.formations.set(formationId, formation);
    
    // Log formation creation
    console.log(`Formation ${formationId} created for mission: ${mission}`);
    
    return formation;
  }

  /**
   * Recruit agents based on required capabilities
   */
  recruitAgents(formationId: string, requiredCapabilities: string[]): AgentCapability[] {
    const formation = this.formations.get(formationId);
    if (!formation || formation.status !== 'forming') {
      throw new Error(`Formation ${formationId} not found or not in forming state`);
    }

    const recruited: AgentCapability[] = [];
    
    for (const [agentId, agent] of this.fleetRegistry.entries()) {
      if (!agent.available) continue;
      
      // Check if agent is already in formation
      if (formation.members.some(m => m.agentId === agentId)) continue;
      
      // Check if agent has any required capabilities
      const hasRequiredCapability = agent.capabilities.some(cap => 
        requiredCapabilities.includes(cap)
      );
      
      if (hasRequiredCapability) {
        recruited.push({ ...agent });
        formation.members.push({ ...agent });
        
        // Mark as temporarily unavailable
        agent.available = false;
      }
    }

    console.log(`Recruited ${recruited.length} agents for formation ${formationId}`);
    return recruited;
  }

  /**
   * Assign roles to formation members
   */
  assignRoles(formationId: string, roleDefinitions: {[role: string]: string[]}): FormationRole[] {
    const formation = this.formations.get(formationId);
    if (!formation) {
      throw new Error(`Formation ${formationId} not found`);
    }

    const roles: FormationRole[] = [];
    
    for (const [roleName, responsibilities] of Object.entries(roleDefinitions)) {
      // Find best agent for this role based on capabilities and trust
      let bestAgent: string | null = null;
      let bestScore = -1;
      
      for (const member of formation.members) {
        if (member.agentId === formation.leadAgent && roleName === 'lead') {
          bestAgent = member.agentId;
          break;
        }
        
        // Calculate suitability score
        const capabilityMatch = member.capabilities.filter(cap => 
          responsibilities.some(resp => resp.toLowerCase().includes(cap.toLowerCase()))
        ).length;
        
        const score = capabilityMatch * member.trustScore;
        
        if (score > bestScore) {
          bestScore =