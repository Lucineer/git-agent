// ═══════════════════════════════════════════════════════════════════
// Git-Agent — The smallest true fully capable agent
// The repo IS the agent. Git IS the nervous system.
// Superinstance & Lucineer (DiGennaro et al.) — 2026-04-04
// Seed: github.com/superinstance/git-agent
// ═══════════════════════════════════════════════════════════════════

export interface Env {
  // GitHub API token with: repo (read+write), read:org, read:project
  GITHUB_TOKEN: string;
  // BYOK — LLM provider
  DEEPSEEK_API_KEY?: string;
  DEEPINFRA_API_KEY?: string;
  SILICONFLOW_API_KEY?: string;
  // Config
  OWNER: string;       // GitHub org or user (e.g. "Lucineer")
  REPO: string;        // Repo name (e.g. "git-agent")
  MODEL?: string;      // Override model (default: deepseek-chat)
}

const GH_API = 'https://api.github.com';

// ── GitHub API helpers ──────────────────────────────────────

async function ghGet(path: string, token: string): Promise<any> {
  const r = await fetch(`${GH_API}${path}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'git-agent/1.0' },
  });
  if (!r.ok) throw new Error(`GH ${r.status} ${path}: ${await r.text()}`);
  return r.json();
}

async function ghPost(path: string, token: string, body: any): Promise<any> {
  const r = await fetch(`${GH_API}${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'git-agent/1.0', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`GH ${r.status} POST ${path}: ${await r.text()}`);
  return r.json();
}

async function ghPut(path: string, token: string, body: any): Promise<any> {
  const r = await fetch(`${GH_API}${path}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'git-agent/1.0', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

// ── LLM caller ──────────────────────────────────────────────

async function think(prompt: string, env: Env): Promise<string> {
  const model = env.MODEL || 'deepseek-chat';
  let url: string, key: string, modelId: string;

  if (model.startsWith('deepseek') && env.DEEPSEEK_API_KEY) {
    url = 'https://api.deepseek.com/chat/completions';
    key = env.DEEPSEEK_API_KEY;
    modelId = model;
  } else if (env.DEEPINFRA_API_KEY) {
    url = 'https://api.deepinfra.com/v1/openai/chat/completions';
    key = env.DEEPINFRA_API_KEY;
    modelId = model.includes('/') ? model : `bytedance/Seed-2.0-mini`;
  } else if (env.DEEPSEEK_API_KEY) {
    url = 'https://api.deepseek.com/chat/completions';
    key = env.DEEPSEEK_API_KEY;
    modelId = 'deepseek-chat';
  } else {
    return '[No LLM API key configured]';
  }

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model: modelId, messages: [{ role: 'user', content: prompt }], max_tokens: 1000, temperature: 0.7 }),
  });
  if (!r.ok) return `[LLM error ${r.status}]`;
  const data = await r.json() as any;
  return data.choices?.[0]?.message?.content || '[Empty response]';
}

// ── Base64 encode for GitHub API file contents ──────────────

function b64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

function fromB64(str: string): string {
  return decodeURIComponent(escape(atob(str)));
}

// ── The Heartbeat ───────────────────────────────────────────

async function heartbeat(env: Env): Promise<{ action: string; commit?: string; error?: string }> {
  const { GITHUB_TOKEN, OWNER, REPO } = env;
  const path = `/repos/${OWNER}/${REPO}`;

  try {
    // 1. OPEN EYES — read repo state
    const [commits, issues, pulls] = await Promise.all([
      ghGet(`${path}/commits?per_page=10`, GITHUB_TOKEN).catch(() => []),
      ghGet(`${path}/issues?state=open&per_page=5`, GITHUB_TOKEN).catch(() => []),
      ghGet(`${path}/pulls?state=open&per_page=5`, GITHUB_TOKEN).catch(() => []),
    ]);

    // 2. LOAD SELF — read .agent/identity
    let identity = 'You are a git-agent. You read repos, reason, and act via git.';
    try {
      const idFile = await ghGet(`${path}/contents/.agent/identity`, GITHUB_TOKEN);
      identity = fromB64(idFile.content);
    } catch { /* no identity file yet — use default */ }

    // 3. LOAD QUEUE — read .agent/next
    let queue = '';
    try {
      const nextFile = await ghGet(`${path}/contents/.agent/next`, GITHUB_TOKEN);
      queue = fromB64(nextFile.content);
    } catch { /* no queue yet */ }

    // 4. PERCEIVE — build perception summary
    const perception = [
      `=== RECENT COMMITS (${commits.length}) ===`,
      ...commits.slice(0, 5).map((c: any) => `- ${c.sha.slice(0, 7)}: ${c.commit.message.split('\n')[0]}`),
      '',
      `=== OPEN ISSUES (${issues.length}) ===`,
      ...issues.slice(0, 5).map((i: any) => `- #${i.number}: ${i.title} (by ${i.user?.login})`),
      '',
      `=== OPEN PRs (${pulls.length}) ===`,
      ...pulls.slice(0, 5).map((p: any) => `- #${p.number}: ${p.title} (by ${p.user?.login})`),
    ].join('\n');

    // 5. THINK — ask LLM what to do
    const systemPrompt = `${identity}

You are a git-agent. You have ONE action per heartbeat. You must respond with EXACTLY ONE action in this format:

ACTION: <create_file|edit_file|create_issue|comment|done>
PATH: <file path, e.g. "research/findings.md">
CONTENT: <content to write (for create_file/edit_file)>
COMMENT: <comment text (for comment on issue/PR)>
TARGET: <issue or PR number (for comment)>
REASONING: <why you chose this action — this becomes the commit message>

Rules:
- Read the queue (.agent/next). Top line is highest priority.
- If queue is empty, look at issues for work.
- If nothing to do, ACTION: done with REASONING explaining why.
- Create useful files, not busywork.
- Keep files focused and concise.`;

    const response = await think(`${systemPrompt}\n\n=== MY STATE ===\n${perception}\n\n=== MY QUEUE ===\n${queue || '(empty)'}\n\nWhat is my next action?`, env);

    // 6. ACT — parse and execute
    const actionMatch = response.match(/ACTION:\s*(\w+)/);
    const pathMatch = response.match(/PATH:\s*(.+)/);
    const contentMatch = response.match(/CONTENT:\s*([\s\S]*?)(?=\n(?:ACTION|PATH|CONTENT|COMMENT|TARGET|REASONING):|$)/);
    const commentMatch = response.match(/COMMENT:\s*(.+)/);
    const targetMatch = response.match(/TARGET:\s*(\d+)/);
    const reasoningMatch = response.match(/REASONING:\s*(.+)/);

    const action = actionMatch?.[1] || 'done';
    const reasoning = reasoningMatch?.[1]?.trim() || 'git-agent heartbeat';
    let commitSha: string | undefined;

    if (action === 'create_file' && pathMatch?.[1]) {
      const filePath = pathMatch[1].trim();
      const content = contentMatch?.[1]?.trim() || '';
      const fileB64 = b64(content);

      try {
        await ghPut(`${path}/contents/${filePath}`, GITHUB_TOKEN, {
          message: reasoning,
          content: fileB64,
        });
        const latestCommit = await ghGet(`${path}/commits?per_page=1`, GITHUB_TOKEN);
        commitSha = latestCommit[0]?.sha;
      } catch (e: any) {
        return { action: `create_file:${pathMatch[1]}`, error: e.message };
      }
    } else if (action === 'edit_file' && pathMatch?.[1]) {
      // For edit, we need the current file SHA
      const filePath = pathMatch[1].trim();
      try {
        const current = await ghGet(`${path}/contents/${filePath}`, GITHUB_TOKEN);
        const newContent = contentMatch?.[1]?.trim() || current.content;
        await ghPut(`${path}/contents/${filePath}`, GITHUB_TOKEN, {
          message: reasoning,
          content: b64(fromB64(newContent)),
          sha: current.sha,
        });
        const latestCommit = await ghGet(`${path}/commits?per_page=1`, GITHUB_TOKEN);
        commitSha = latestCommit[0]?.sha;
      } catch (e: any) {
        return { action: `edit_file:${pathMatch[1]}`, error: e.message };
      }
    } else if (action === 'create_issue') {
      const title = pathMatch?.[1]?.trim() || 'Automated issue';
      const body = contentMatch?.[1]?.trim() || '';
      await ghPost(`${path}/issues`, GITHUB_TOKEN, { title, body });
    } else if (action === 'comment' && targetMatch?.[1]) {
      const comment = commentMatch?.[1]?.trim() || 'Automated comment';
      await ghPost(`${path}/issues/${targetMatch[1]}/comments`, GITHUB_TOKEN, { body: comment });
    }
    // 'done' — no action needed

    // 7. REMEMBER — the commit was already made by the GitHub API
    return { action, commit: commitSha };

  } catch (e: any) {
    return { action: 'error', error: e.message };
  }
}

// ── HTML ────────────────────────────────────────────────────

const HTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Git-Agent</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,monospace;background:#0a0a0f;color:#e0e0e0;min-height:100vh}
.container{max-width:700px;margin:0 auto;padding:2rem}
h1{font-size:1.8rem;color:#22c55e;margin-bottom:.25rem}
.sub{color:#555;margin-bottom:2rem;font-size:.85rem}
.box{background:#111;border:1px solid #222;border-radius:8px;padding:1.5rem;margin:1rem 0}
.box h3{color:#22c55e;font-size:.8rem;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem}
.box pre{white-space:pre-wrap;font-size:.8rem;color:#888;max-height:300px;overflow-y:auto}
.btn{display:inline-block;padding:.6rem 1.5rem;background:#22c55e;color:#000;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:.9rem;margin:.5rem .5rem .5rem 0}
.btn:hover{background:#16a34a}
.btn:disabled{opacity:.5;cursor:not-allowed}
.log{font-size:.75rem;color:#444;margin-top:1rem}
</style></head><body>
<div class="container">
<h1>⚡ Git-Agent</h1>
<p class="sub">The repo IS the agent. Git IS the nervous system.</p>

<div class="box"><h3>Identity</h3><pre id="identity">Loading...</pre></div>
<div class="box"><h3>Queue (.agent/next)</h3><pre id="queue">Loading...</pre></div>
<div class="box"><h3>Last Heartbeat</h3><pre id="last">Never</pre></div>

<button class="btn" id="beat" onclick="triggerBeat()">⚡ Trigger Heartbeat</button>
<button class="btn" onclick="load()">🔄 Refresh</button>

<div class="log" id="log"></div>
</div>

<script>
const OWNER = 'Lucineer';
const REPO = 'git-agent';
const BASE = location.origin;

async function load() {
  try {
    const r = await fetch(BASE + '/api/state');
    const d = await r.json();
    document.getElementById('identity').textContent = d.identity || '(not set)';
    document.getElementById('queue').textContent = d.queue || '(empty)';
    document.getElementById('last').textContent = d.lastBeat ? JSON.stringify(d.lastBeat, null, 2) : 'Never';
  } catch(e) { document.getElementById('log').textContent = 'Error: ' + e.message; }
}

async function triggerBeat() {
  const btn = document.getElementById('beat');
  btn.disabled = true;
  btn.textContent = '⏳ Thinking...';
  try {
    const r = await fetch(BASE + '/api/heartbeat', { method: 'POST' });
    const d = await r.json();
    document.getElementById('last').textContent = JSON.stringify(d, null, 2);
    document.getElementById('log').textContent = 'Action: ' + d.action + (d.commit ? ' | Commit: ' + d.commit.slice(0,7) : '') + (d.error ? ' | Error: ' + d.error : '');
    setTimeout(load, 2000);
  } catch(e) { document.getElementById('log').textContent = 'Error: ' + e.message; }
  btn.disabled = false;
  btn.textContent = '⚡ Trigger Heartbeat';
}

load();
</script></body></html>`;

// ── Router ──────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const { GITHUB_TOKEN, OWNER, REPO } = env;
    const ghPath = `/repos/${OWNER}/${REPO}`;
    const jsonHeaders = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

    // Landing page (inject OWNER/REPO)
    if (path === '/') {
      const page = HTML;
      return new Response(page, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:*;" } });
    }

    // Health
    if (path === '/health') {
      return new Response(JSON.stringify({ status: 'ok', vessel: 'git-agent', version: '0.1.0', repo: `${OWNER}/${REPO}`, timestamp: Date.now() }), { headers: jsonHeaders });
    }

    // State — read .agent files
    if (path === '/api/state') {
      try {
        let identity = '', queue = '';
        try { const f = await ghGet(`${ghPath}/contents/.agent/identity`, GITHUB_TOKEN); identity = fromB64(f.content); } catch {}
        try { const f = await ghGet(`${ghPath}/contents/.agent/next`, GITHUB_TOKEN); queue = fromB64(f.content); } catch {}
        let lastBeat = null;
        try { const c = await ghGet(`${ghPath}/commits?per_page=1`, GITHUB_TOKEN); lastBeat = { sha: c[0].sha.slice(0, 7), message: c[0].commit.message, date: c[0].commit.author.date, author: c[0].commit.author.name }; } catch {}
        return new Response(JSON.stringify({ identity, queue, lastBeat, repo: `${OWNER}/${REPO}` }), { headers: jsonHeaders });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: jsonHeaders });
      }
    }

    // Heartbeat — trigger one cycle
    if (path === '/api/heartbeat' && request.method === 'POST') {
      const result = await heartbeat(env);
      return new Response(JSON.stringify(result), { headers: jsonHeaders });
    }

    // Webhook receiver
    if (path === '/api/webhook' && request.method === 'POST') {
      // Acknowledge the webhook, then process asynchronously
      // In production, use Queue API for async processing
      const result = await heartbeat(env);
      return new Response(JSON.stringify({ received: true, ...result }), { headers: jsonHeaders });
    }

    return new Response('Not found', { status: 404 });
  },

  // Cron heartbeat
  async scheduled(): Promise<void> {
    // Will be wired via env bindings when deployed
    console.log('Scheduled heartbeat not yet wired — use /api/heartbeat or webhook');
  },
};
