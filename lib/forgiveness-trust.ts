/**
 * Forgiveness-Trust Function
 * 
 * A mathematical model for trust repair in multi-agent systems.
 * Based on the concept that trust can be repaired through forgiveness,
 * which is a function of time, remorse, and repeated positive interactions.
 * 
 * f(t, r, n) = (1 - e^(-λt)) * (r + α * n) / (1 + β * e^(-γt))
 * 
 * Where:
 * - t: time since transgression
 * - r: remorse signal (0 to 1)
 * - n: number of positive interactions since transgression
 * - λ: decay rate of initial distrust
 * - α: weight of positive interactions
 * - β: scaling factor for time effect
 * - γ: rate of forgiveness acceleration
 */

export interface ForgivenessParams {
    /** Time since transgression (in arbitrary units) */
    time: number;
    /** Remorse signal (0 = none, 1 = full remorse) */
    remorse: number;
    /** Number of positive interactions since transgression */
    positiveInteractions: number;
    /** Decay rate of initial distrust (default: 0.1) */
    lambda?: number;
    /** Weight of positive interactions (default: 0.3) */
    alpha?: number;
    /** Scaling factor for time effect (default: 2.0) */
    beta?: number;
    /** Rate of forgiveness acceleration (default: 0.05) */
    gamma?: number;
}

export interface ForgivenessResult {
    /** Trust level (0 to 1, where 1 is full trust) */
    trust: number;
    /** Components for debugging/analysis */
    components: {
        timeFactor: number;
        interactionFactor: number;
        denominator: number;
    };
}

/**
 * Calculate forgiveness-based trust level
 */
export function calculateForgivenessTrust(params: ForgivenessParams): ForgivenessResult {
    const {
        time,
        remorse,
        positiveInteractions,
        lambda = 0.1,
        alpha = 0.3,
        beta = 2.0,
        gamma = 0.05
    } = params;

    // Clamp inputs to valid ranges
    const clampedRemorse = Math.max(0, Math.min(1, remorse));
    const clampedInteractions = Math.max(0, positiveInteractions);
    const clampedTime = Math.max(0, time);

    // Time-based forgiveness factor (approaches 1 as time increases)
    const timeFactor = 1 - Math.exp(-lambda * clampedTime);

    // Contribution from remorse and positive interactions
    const interactionFactor = clampedRemorse + alpha * clampedInteractions;

    // Denominator that decreases over time (forgiveness accelerates)
    const denominator = 1 + beta * Math.exp(-gamma * clampedTime);

    // Final trust calculation
    const trust = (timeFactor * interactionFactor) / denominator;

    // Clamp trust to [0, 1]
    const clampedTrust = Math.max(0, Math.min(1, trust));

    return {
        trust: clampedTrust,
        components: {
            timeFactor,
            interactionFactor,
            denominator
        }
    };
}

/**
 * Simplified version for common use cases
 */
export function simpleForgivenessTrust(
    time: number,
    remorse: number,
    positiveInteractions: number = 0
): number {
    return calculateForgivenessTrust({
        time,
        remorse,
        positiveInteractions
    }).trust;
}

/**
 * Generate a series of trust values over time for visualization/analysis
 */
export function generateTrustTimeline(
    initialParams: ForgivenessParams,
    steps: number,
    timeStep: number = 1
): Array<{ time: number; trust: number }> {
    const results = [];
    
    for (let i = 0; i < steps; i++) {
        const currentTime = i * timeStep;
        const params = {
            ...initialParams,
            time: currentTime
        };
        
        const result = calculateForgivenessTrust(params);
        results.push({
            time: currentTime,
            trust: result.trust
        });
    }
    
    return results;
}