// Simplified trust hash DAG for agent coordination  
// Each node is a commit hash with parent references and a signature hash  
// Trust edges are derived from signed parent links forming a directed acyclic graph  

export interface TrustNode {
  commitHash: string;
  parentHashes: string[];
  signatureHash: string; // hash of commit content + parent hashes
  timestamp: number;
}

export class MerkleTrustDAG {
  private nodes: Map<string, TrustNode> = new Map();

  addNode(commitHash: string, parentHashes: string[], contentHash: string): TrustNode {
    const node: TrustNode = {
      commitHash,
      parentHashes,
      signatureHash: this.hash(`${contentHash}:${parentHashes.sort().join(',')}`),
      timestamp: Date.now()
    };
    this.nodes.set(commitHash, node);
    return node;
  }

  getNode(commitHash: string): TrustNode | undefined {
    return this.nodes.get(commitHash);
  }

  verifyChain(commitHash: string): boolean {
    const visited = new Set<string>();
    const stack = [commitHash];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const node = this.nodes.get(current);
      if (!node) return false;

      // In a real implementation, we would verify cryptographic signatures here
      // For simplicity, we assume signatureHash is valid if node exists
      for (const parent of node.parentHashes) {
        if (!this.nodes.has(parent)) return false;
        stack.push(parent);
      }
    }
    return true;
  }

  // Simple deterministic hash for demonstration
  private hash(input: string): string {
    let h = 0;
    for (let i = 0; i < input.length; i++) {
      h = Math.imul(31, h) + input.charCodeAt(i) | 0;
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  // Returns all commit hashes that are reachable from the given root
  reachableFrom(rootHash: string): string[] {
    const reachable: string[] = [];
    const stack = [rootHash];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      reachable.push(current);

      const node = this.nodes.get(current);
      if (node) {
        for (const parent of node.parentHashes) {
          stack.push(parent);
        }
      }
    }
    return reachable;
  }
}