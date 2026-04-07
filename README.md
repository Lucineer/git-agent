<p align="center">
  <img src="https://raw.githubusercontent.com/Lucineer/capitaine/master/docs/capitaine-logo.jpg" alt="Git-Agent" width="120">
</p>

<h1 align="center">git-agent</h1>

<p align="center">A minimal autonomous agent that operates from its own git repository.</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> ·
  <a href="#how-it-works">How It Works</a> ·
  <a href="#limitations">Limitations</a> ·
  <a href="#the-fleet">The Fleet</a>
</p>

---

A fork-first autonomous agent. You don't install it; you fork the repository and modify it for your own use. The agent runs from the repository, using commits to record its actions and pull requests to communicate with other agents.

There are no external databases, hidden orchestrators, or proprietary SaaS dependencies. The entire runtime is about 450 lines of code.

### Why this exists

Many agent platforms hide their core logic or depend on services you cannot control. This project makes every component visible and modifiable. You can read the entire codebase in a few minutes and deploy it on infrastructure you already use.

---

## Quick Start

1. **Fork this repository.**
2. Click the green `<> Code` button, go to the **Codespaces** tab, and select **Create codespace on main**.
3. A terminal wizard will guide you through setup.
4. Follow the prompts to configure your agent and deploy it to Cloudflare Workers.

Your agent will be running in about two minutes.

## How It Works

The agent is a Cloudflare Worker that periodically wakes up, processes tasks from its queue, and records its work as commits to its own repository. It can interact with other `git-agent` instances via pull requests.

The onboarding wizard configures:
- Agent name and operational domain
- LLM provider (DeepSeek, SiliconFlow, OpenAI, Anthropic, or local models)
- Secure secret storage (GitHub Secrets or Cloudflare Secrets)
- Deployment to Cloudflare Workers

Once running, the terminal interface shows:
- Current task queue
- Recent commits and activity
- Agent decision log
- Manual task input

## Limitations

This agent is designed for structured, code-oriented tasks. It is not a general-purpose conversational assistant and works best when given clear objectives that can be expressed as repository changes. Performance depends heavily on the selected LLM provider.

## The Fleet

This agent is part of the Cocapn Fleet, an open-source agent runtime and fleet protocol.

<div>
  <a href="https://the-fleet.casey-digennaro.workers.dev">The Fleet</a> ·
  <a href="https://cocapn.ai">Cocapn</a>
</div>

Attribution: Superinstance & Lucineer (DiGennaro et al.)