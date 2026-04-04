# Git‑Agent Onboarding Guide

This guide walks a developer through setting up their own git‑agent instance, from forking the repository to watching the agent execute its first tasks.

## Prerequisites

- A GitHub account
- A Cloudflare account (free tier works)
- Basic familiarity with git, GitHub Actions, and environment variables

## Step 1 – Fork the repository

1. Navigate to the [git‑agent repository](https://github.com/Lucineer/git‑agent).
2. Click **Fork** in the top‑right corner.
3. Choose your personal account or organization as the destination.

## Step 2 – Configure repository secrets

In your forked repository, go to **Settings → Secrets and variables → Actions**.

Add the following secrets:

| Secret name | Description | Example / notes |
|-------------|-------------|-----------------|
| `AGENT_NAME` | The name your agent will use in commits and issues. | `Flux` |
| `AGENT_IDENTITY` | A short description of the agent’s role and constraints. | `Research and development agent. Explores ideas, writes papers, creates code, coordinates via git.` |
| `GITHUB_TOKEN` | A personal access token with `repo` scope. | Generate under **Developer settings → Personal access tokens → Fine‑grained tokens**. |
| `OPENAI_API_KEY` | Your OpenAI API key (if using GPT‑4/GPT‑3.5 as the strategist). | Optional; if omitted, the agent will run without a strategist. |
| `HEARTBEAT_INTERVAL_SECONDS` | How often the agent wakes up (in seconds). | `300` (5 minutes) |

## Step 3 – Customize the agent’s identity

Edit `.agent/identity.md` to reflect your agent’s purpose, strengths, and constraints.  
Example:

```markdown
You are a git‑agent living in the [YourOrg] org. Your name is [YourAgentName].

You are a [specialty] agent. [Describe what you do].

Your constraints:
- One action per heartbeat (one commit, one issue, one comment)
- Every action must produce a commit with clear reasoning
- You read your queue (.agent/next) for tasks
- You create useful files, not busywork
- You are first‑class: you report to the UI/API, not to a human
- You use git as your entire coordination layer

Your strengths:
- [Strength 1]
- [Strength 2]
- [Strength 3]

You were created by [YourName/Org].
```

## Step 4 – Deploy to Cloudflare Workers

1. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. Authenticate with Cloudflare:
   ```bash
   wrangler login
   ```

3. Clone your forked repository:
   ```bash
   git clone https://github.com/your-username/git-agent.git
   cd git-agent
   ```

4. Deploy the worker:
   ```bash
   wrangler deploy
   ```

   The deployment will output a URL like `https://git-agent.your-subdomain.workers.dev`.

## Step 5 – Set up the GitHub webhook

1. In your repository, go to **Settings → Webhooks → Add webhook**.
2. **Payload URL**: Enter your Cloudflare Worker URL.
3. **Content type**: `application/json`
4. **Events**: Select **Let me select individual events** and check:
   - Issues
   - Issue comments
   - Pull requests
   - Pull request reviews
   - Pushes
5. Click **Add webhook**.

## Step 6 – Queue your first task

Create a file `.agent/next` in the root of your repository.  
Add one task per line, in order of priority. Example:

```
Create the file README.md — explain the project’s purpose and how to contribute.
Create the file lib/core.ts — implement the basic agent loop.
Open an issue “Discuss: Should we add a memory module?” — to start a design conversation.
```

Commit and push the file. The webhook will trigger the agent’s first heartbeat.

## Step 7 – Watch the agent work

- The agent will read `.agent/next`, execute the top task, and commit the result.
- Check the **Actions** tab to see heartbeat logs.
- Monitor the repository for new commits, issues, and pull requests.

## Troubleshooting

**Agent isn’t running:**
- Verify the webhook is active (green checkmark in Settings → Webhooks).
-