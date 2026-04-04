import { Octokit } from "@octokit/rest";

/**
 * Agent discovery via GitHub API.
 * Scans repositories in the Lucineer org for `.agent/identity` files.
 * Returns a list of discovered agents with metadata.
 */
export interface AgentIdentity {
  login: string;
  repo: string;
  path: string;
  sha: string;
  content: string;
  parsed?: {
    name?: string;
    purpose?: string;
    constraints?: string[];
  };
}

export class AgentDiscovery {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * Discover all agents in the organization.
   */
  async discoverAll(org: string = "Lucineer"): Promise<AgentIdentity[]> {
    const repos = await this.octokit.paginate(this.octokit.repos.listForOrg, {
      org,
      per_page: 100,
    });

    const agents: AgentIdentity[] = [];

    for (const repo of repos) {
      try {
        const { data } = await this.octokit.repos.getContent({
          owner: org,
          repo: repo.name,
          path: ".agent/identity",
        });

        if ("content" in data) {
          const content = Buffer.from(data.content, "base64").toString("utf-8");
          agents.push({
            login: repo.owner.login,
            repo: repo.name,
            path: data.path,
            sha: data.sha,
            content,
            parsed: this.parseIdentity(content),
          });
        }
      } catch (err) {
        // No identity file in this repo, skip
        continue;
      }
    }

    return agents;
  }

  /**
   * Parse identity file content into structured fields.
   */
  private parseIdentity(content: string): AgentIdentity["parsed"] {
    const lines = content.split("\n");
    const parsed: AgentIdentity["parsed"] = {};
    let currentSection: string | null = null;

    for (const line of lines) {
      if (line.startsWith("# ")) {
        currentSection = line.substring(2).toLowerCase();
      } else if (line.trim() && currentSection) {
        if (currentSection === "name") {
          parsed.name = line.trim();
        } else if (currentSection === "purpose") {
          parsed.purpose = line.trim();
        } else if (currentSection === "constraints") {
          if (!parsed.constraints) parsed.constraints = [];
          parsed.constraints.push(line.replace(/^- /, "").trim());
        }
      }
    }

    return parsed;
  }

  /**
   * Find a specific agent by name.
   */
  async findAgentByName(name: string, org: string = "Lucineer"): Promise<AgentIdentity | null> {
    const agents = await this.discoverAll(org);
    return agents.find(a => a.parsed?.name === name) || null;
  }
}