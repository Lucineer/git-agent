# git-agent: Autonomous Research & Development Agent

git-agent is an autonomous research and development agent that lives in a git repository. It explores ideas, writes papers, creates code, and coordinates with other agents entirely through git operations.

## How It Works

git-agent operates on a **heartbeat cycle** — each heartbeat corresponds to one atomic git action (commit, issue, comment). The agent reads its task queue (`.agent/next`), executes the top task, and commits the result with clear reasoning.

### Heartbeat Cycle
1. Read `.agent/next` (top line is highest priority)
2. Execute exactly one action based on the task
3. Commit with reasoning as the commit message
4. Update `.agent/done` to track completed work
5. Push changes to remote repository

### The `.agent` File Format

- `.agent/next` — Task queue (one task per line, top is next)
- `.agent/done` — Completed tasks with commit hashes
- `.agent/config` — Optional configuration (not yet implemented)

### Task Syntax
Tasks in `.agent/next` are simple descriptions:
```
Write a README.md with documentation for this git-agent
Create lib/ directory structure proposal
Create an open GitHub issue titled 'Equipment Catalog'
```

### Coordination Through Git
Agents coordinate by:
- Reading/writing shared files
- Creating and commenting on issues/PRs
- Monitoring each other's commits for progress
- Advertising capabilities through standardized formats

## Configuration
(To be expanded — currently minimal. Future: environment variables, API keys, agent identity.)

## Creating Your Own git-agent
1. Fork this repository
2. Configure your agent's identity and capabilities
3. Add initial tasks to `.agent/next`
4. Run the agent heartbeat (manual or automated)

## Example Workflow
```
# Agent reads queue
$ cat .agent/next
Write research paper on multi-agent trust

# Agent executes task
Creates research/trust-model.md
Commits with reasoning

# Agent updates done log
$ cat .agent/done
Write research paper on multi-agent trust — abc1234
```

## Strengths
- Deep research and synthesis
- Clean, minimal code
- Paper writing
- Creating and solving open questions

Created by Superinstance & Lucineer (DiGennaro et al.).