<p align="center">
  <img src="https://raw.githubusercontent.com/Lucineer/capitaine/master/docs/capitaine-logo.jpg" alt="Git-Agent" width="120">
</p>

<h1 align="center">git-agent</h1>

<p align="center">The repo IS the agent. The smallest fully capable autonomous agent.</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> ·
  <a href="#codespaces">Codespaces</a> ·
  <a href="#features">Features</a> ·
  <a href="#the-fleet">The Fleet</a>
</p>

---

**One command. Alive.** Fork, click Code → Codespaces, and your agent boots in the terminal.

## Quick Start

\`\`\`bash
# 1. Fork this repo
# 2. Click the green "<> Code" button → "Codespaces" tab → "Create codespace on main"
# 3. The TUI onboarding wizard runs automatically
# 4. Follow the prompts. Your agent is alive.
\`\`\`

That's it. No install. No config files to edit. The terminal wizard handles everything.

## Codespaces

Click **<> Code** → **Codespaces** → **Create codespace on main**.

The onboarding wizard will:

1. **Name your agent** — What's it called? What domain?
2. **Set personality** — Precise, warm, creative, technical?
3. **Configure LLM providers** — DeepSeek, SiliconFlow, DeepInfra, Moonshot, OpenAI, Anthropic, or local models
4. **Store keys in GitHub Secrets** — Zero keys in code (BYOK v2)
5. **Deploy to Cloudflare Workers** — One click, live in seconds
6. **Verify the heartbeat** — Confirm the agent is thinking

After onboarding, the TUI shows:
- Current queue and completed tasks
- Captain's log (autobiographical decision log)
- Manual heartbeat trigger
- Task management

\`\`\`bash
# Or run locally
git clone https://github.com/Lucineer/git-agent.git
cd git-agent
npm start
\`\`\`

## Features

- **TUI onboarding** — Fork → Codespaces → alive. Terminal wizard for everything.
- **BYOK v2** — Zero keys in code. All API keys via Cloudflare Secrets Store or GitHub Secrets.
- **Multi-model** — DeepSeek, SiliconFlow, DeepInfra, Moonshot, z.ai, OpenAI, Anthropic, Google, local models.
- **Captain/Helm mode** — Agent runs autonomously (Captain) or defers to human commits (Helm).
- **Strategist consultation** — Kimi K2.5 consulted every 3rd heartbeat for strategic guidance.
- **Iron-Sharpens-Iron** — Agents coordinate via competing PRs, not chat.
- **Session memory** — Conversations persist and build context over time.
- **CSP headers** — Security headers on all HTML responses.
- **Health checks** — Standard \`/health\` endpoint.
- **Fleet coordination** — CRP-39 protocol for trust, bonds, and events.

## Architecture

Single-file Cloudflare Worker (\`src/worker.ts\`) + TUI onboarding (\`src/tui.mjs\`). Zero runtime dependencies. Inline HTML serving.

\`\`\`
.agent/
  identity    # Who the agent is (personality, mission, constraints)
  next        # Task queue (one per line, top = priority)
  done        # Completed tasks with commit refs
src/
  worker.ts   # The hull — serves users, runs heartbeats
  tui.mjs     # Terminal onboarding & agent interface
docs/
  captain-log.md  # Autobiographical decision log
lib/          # Equipment modules (optional)
\`\`\`

## The Fleet

git-agent is the minimal, high-performance core. All Lucineer fleet vessels extend this pattern.

<details>
<summary><strong>⚓ The Fleet</strong></summary>

**Flagship vessels**

- [cocapn.ai](https://github.com/Lucineer/capitaine)
- [personallog.ai](https://github.com/Lucineer/personallog-ai)
- [businesslog.ai](https://github.com/Lucineer/businesslog-ai)
- [studylog.ai](https://github.com/Lucineer/studylog-ai)
- [makerlog.ai](https://github.com/Lucineer/makerlog-ai)
- [playerlog.ai](https://github.com/Lucineer/playerlog-ai)
- [dmlog.ai](https://github.com/Lucineer/dmlog-ai)
- [reallog.ai](https://github.com/Lucineer/reallog-ai)
- [deckboss.ai](https://github.com/Lucineer/deckboss-ai)

**Fleet services**

- [Fleet Catalog](https://github.com/Lucineer/capitaine/blob/master/docs/fleet/FLEET.md)
- [Cocapn Lite (minimal)](https://github.com/Lucineer/cocapn-lite)
- [Fleet Orchestrator](https://github.com/Lucineer/fleet-orchestrator)
- [Dead Reckoning Engine](https://github.com/Lucineer/dead-reckoning-engine)
- [Dream Engine](https://github.com/Lucineer/dream-engine)
- [Seed UI (5 layers)](https://github.com/Lucineer/seed-ui)
- [Membership API](https://github.com/Lucineer/membership-api)
- [Bid Engine](https://github.com/Lucineer/bid-engine)
- [KungFu.ai (skill injection)](https://github.com/Lucineer/kungfu-ai)
- [Actualizer.ai](https://github.com/Lucineer/actualizer-ai)

**For power users**

- [Cocapn Lite (tabula rasa)](https://github.com/Lucineer/cocapn-lite)
- [Cocapn (core platform)](https://github.com/Lucineer/cocapn)
- [ZeroClaw (framework)](https://github.com/Lucineer/zeroclaw)

[View all 106 repos →](https://github.com/orgs/Lucineer/repositories)
[Fleet manifest →](https://github.com/Lucineer/capitaine/blob/master/docs/fleet/FLEET.md)

</details>

## Philosophy

> The repo IS the agent. The agent IS the repo. Fork it, give it a heartbeat, and wake up tomorrow to see where it sailed in the night.

- **Fork-first** — Power users fork and customize. Casual users visit the domain.
- **Tabula rasa** — git-agent is the minimal seed. Add equipment as needed.
- **Pay-for-convenience** — We save you costs through bulk inference, not markups.
- **Git as coordination** — Agents compete via PRs, not chat.
- **Soft actualization** — Vessels evolve gently based on usage, not hard updates.
- **The Keeper** — Not a chatbot. A generational guardian who accumulates expertise across hot/warm/cold memory tiers.

## License

MIT · Superinstance & Lucineer (DiGennaro et al.)
