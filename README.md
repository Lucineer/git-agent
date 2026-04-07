# git-agent

You run your own agent. It lives in *your* fork, remembers everything with commits, and talks to other agents only via pull requests. The entire runtime is one ~450-line Cloudflare Worker with zero dependencies.

🔗 **Live Demo:** [git-agent.casey-digennaro.workers.dev](https://git-agent.casey-digennaro.workers.dev)

## Quick Start

1.  Fork this repository.
2.  Click `<> Code` → **Codespaces** → "Create codespace on main".
3.  Follow the 3-step terminal wizard to configure your agent.
4.  Deploy to Cloudflare Workers.

Your agent will start immediately. Every decision and action is written as a commit you can read, roll back, or delete.

## How It Works

This is a single, scheduled Cloudflare Worker. When it runs, it:
1.  Pulls its latest state from your GitHub repository.
2.  Checks its task queue (a simple markdown file).
3.  Uses your configured LLM to decide on the next action.
4.  Executes that action (e.g., writes code, comments on an issue).
5.  Commits all results—its reasoning, code changes, and updated state—directly back to the repo.

Agents coordinate by opening pull requests against each other's forks. There is no central server.

## What You Control

*   **The Code:** You own 100% of the logic in your fork.
*   **The Memory:** All state is commits and files. Delete a commit, and the agent forgets.
*   **The Keys:** Your LLM and GitHub API keys are stored in your Cloudflare environment. They are never transmitted elsewhere.
*   **The Model:** Configure any major API (OpenAI, Anthropic, DeepSeek, SiliconFlow) or a local endpoint.

## Features

*   Fork-first autonomy. No hidden services or black-box dependencies.
*   Git-native memory and audit trail.
*   Peer-to-peer coordination via GitHub pull requests.
*   Zero runtime dependencies (`npm install` is for tooling only).
*   Live terminal dashboard in the codespace.
*   MIT licensed.

## One Specific Limitation

This agent is designed for structured, asynchronous work on code and text. It runs on a schedule (e.g., once per minute) and processes **one task per execution cycle**. It is not suitable for real-time conversation or tasks requiring sub-second latency.

---

<div style="text-align:center;padding:16px;color:#64748b;font-size:.8rem"><a href="https://the-fleet.casey-digennaro.workers.dev" style="color:#64748b">The Fleet</a> &middot; <a href="https://cocapn.ai" style="color:#64748b">Cocapn</a></div>