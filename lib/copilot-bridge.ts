```typescript
/**
 * GitHub Copilot API Bridge for git-agents
 * 
 * Implements the "LaForge in Engineering" metaphor:
 * - Delegates coding tasks to Copilot
 * - Reviews and refines the output
 * - Integrates with the agent's git workflow
 */

export interface CopilotSuggestion {
    text: string;
    language: string;
    confidence: number;
    metadata?: Record<string, any>;
}

export interface CodeReviewResult {
    suggestions: string[];
    issues: string[];
    score: number;
    passed: boolean;
}

export interface TestGenerationResult {
    unitTests: string[];
    integrationTests: string[];
    coverageEstimate: number;
}

export interface RefactoringResult {
    original: string;
    refactored: string;
    improvements: string[];
    complexityReduction: number;
}

/**
 * Main Copilot bridge class
 */
export class CopilotBridge {
    private apiToken: string;
    private baseUrl: string = 'https://api.github.com/copilot';

    constructor(apiToken: string) {
        this.apiToken = apiToken;
    }

    /**
     * Get code suggestions for a given prompt
     */
    async suggestCode(prompt: string, language: string = 'typescript'): Promise<CopilotSuggestion[]> {
        const response = await this.makeRequest('/suggestions', {
            method: 'POST',
            body: JSON.stringify({
                prompt,
                language,
                max_tokens: 1000,
                temperature: 0.7
            })
        });

        return response.suggestions.map((s: any) => ({
            text: s.text,
            language: s.language,
            confidence: s.confidence,
            metadata: s.metadata
        }));
    }

    /**
     * Review code for quality, style, and potential issues
     */
    async reviewCode(code: string, language: string = 'typescript'): Promise<CodeReviewResult> {
        const response = await this.makeRequest('/review', {
            method: 'POST',
            body: JSON.stringify({
                code,
                language,
                checks: ['quality', 'style', 'security', 'performance']
            })
        });

        return {
            suggestions: response.suggestions || [],
            issues: response.issues || [],
            score: response.score || 0,
            passed: response.passed || false
        };
    }

    /**
     * Generate tests for given code
     */
    async generateTests(code: string, framework: string = 'jest'): Promise<TestGenerationResult> {
        const response = await this.makeRequest('/tests', {
            method: 'POST',
            body: JSON.stringify({
                code,
                framework,
                includeIntegration: true
            })
        });

        return {
            unitTests: response.unit_tests || [],
            integrationTests: response.integration_tests || [],
            coverageEstimate: response.coverage_estimate || 0
        };
    }

    /**
     * Refactor code to improve quality and maintainability
     */
    async refactorCode(code: string, goals: string[] = ['simplify', 'optimize']): Promise<RefactoringResult> {
        const response = await this.makeRequest('/refactor', {
            method: 'POST',
            body: JSON.stringify({
                code,
                goals,
                preserveBehavior: true
            })
        });

        return {
            original: response.original,
            refactored: response.refactored,
            improvements: response.improvements || [],
            complexityReduction: response.complexity_reduction || 0
        };
    }

    /**
     * Batch process multiple coding tasks
     */
    async batchProcess(tasks: Array<{
        type: 'suggest' | 'review' | 'test' | 'refactor';
        input: string;
        options?: Record<string, any>;
    }>): Promise<any[]> {
        const response = await this.makeRequest('/batch', {
            method: 'POST',
            body: JSON.stringify({ tasks })
        });

        return response.results;
    }

    /**
     * Get usage statistics and limits
     */
    async getUsage(): Promise<{
        used: number;
        limit: number;
        resetAt: string;
        requestsRemaining: number;
    }> {
        const response = await this.makeRequest('/usage', {
            method: 'GET'
        });

        return response;
    }

    /**
     * Internal request helper
     */
    private async makeRequest(endpoint: string, options: RequestInit): Promise<any> {
        const url = `${this.baseUrl}${endpoint}`;
        
        const default