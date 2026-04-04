// ═══════════════════════════════════════════════════════════════════
// Git-Agent v1.0 — Fleet Command Runtime
// The repo IS the agent. Git IS the nervous system.
// Star Trek paradigm: Human=Picard(Admiral), Agent=Riker(Captain),
//   Kimi K2.5=Data(Strategist), Claude/Copilot=LaForge(Engineering)
// Iron-Sharpens-Iron: agents coordinate via PRs, not chat.
// Superinstance & Lucineer (DiGennaro et al.) — 2026-04-04
// ═══════════════════════════════════════════════════════════════════

export interface Env {
  GITHUB_TOKEN: string;
  // BYOK providers — each for unique models
  DEEPSEEK_API_KEY?: string;
  MOONSHOT_API_KEY?: string;
  DEEPINFRA_API_KEY?: string;
  SILICONFLOW_API_KEY?: string;
  // Config
  OWNER: string;
  REPO: string;
  MODEL?: string;        // Override model for main thinking
  STRATEGIST_MODEL?: string; // Override for Kimi strategist calls
}

const GH_API = 'https://api.github.com';

// ── GitHub API ──────────────────────────────────────────────

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

async function ghPatch(path: string, token: string, body: any): Promise<any> {
  const r = await fetch(`${GH_API}${path}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'git-agent/1.0', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`GH ${r.status} PATCH ${path}: ${await r.text()}`);
  return r.json();
}

// ── LLM Router — each provider for unique models ────────────

interface LLMCall { url: string; key: string; model: string; temp?: number; maxTokens?: number }

function routeModel(modelName: string, env: Env): LLMCall {
  // Kimi K2.5 — senior strategist (Moonshot direct, temp=1 ONLY)
  if (modelName === 'kimi-k2.5') {
    return { url: 'https://api.moonshot.ai/v1/chat/completions', key: env.MOONSHOT_API_KEY || '', model: 'kimi-k2.5', temp: 1, maxTokens: 6000 };
  }
  // DeepSeek — workhorse
  if (modelName.startsWith('deepseek')) {
    return { url: 'https://api.deepseek.com/chat/completions', key: env.DEEPSEEK_API_KEY || '', model: modelName };
  }
  // DeepInfra — creative models
  if (env.DEEPINFRA_API_KEY) {
    return { url: 'https://api.deepinfra.com/v1/openai/chat/completions', key: env.DEEPINFRA_API_KEY, model: modelName.includes('/') ? modelName : 'ByteDance/Seed-2.0-mini' };
  }
  // Fallback to DeepSeek
  return { url: 'https://api.deepseek.com/chat/completions', key: env.DEEPSEEK_API_KEY || '', model: 'deepseek-chat' };
}

async function think(prompt: string, env: Env, modelOverride?: string): Promise<string> {
  const modelName = modelOverride || env.MODEL || 'deepseek-chat';
  const { url, key, model, temp, maxTokens } = routeModel(modelName, env);
  if (!key) return `[No API key for ${model}]`;

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens || 1000,
      temperature: temp ?? 0.7,
    }),
  });
  if (!r.ok) return `[LLM error ${r.status} on ${model}]`;
  const data = await r.json() as any;
  return data.choices?.[0]?.message?.content || '[Empty response]';
}

// ── Base64 ──────────────────────────────────────────────────

function b64(str: string): string { return btoa(unescape(encodeURIComponent(str))); }
function fromB64(str: string): string { return decodeURIComponent(escape(atob(str))); }

// ── File helpers ────────────────────────────────────────────

async function readFile(path: string, token: string, repoPath: string): Promise<string> {
  const f = await ghGet(`${repoPath}/contents/${path}`, token);
  return fromB64(f.content);
}

async function writeFile(path: string, content: string, message: string, token: string, repoPath: string): Promise<string> {
  let sha: string | undefined;
  try {
    const f = await ghGet(`${repoPath}/contents/${path}`, token);
    sha = f.sha;
  } catch { /* new file */ }
  const body: any = { message, content: b64(content) };
  if (sha) body.sha = sha;
  const result = await ghPut(`${repoPath}/contents/${path}`, token, body);
  const commits = await ghGet(`${repoPath}/commits?per_page=1`, token);
  return commits[0]?.sha || 'unknown';
}

// ── Queue Management ────────────────────────────────────────

async function advanceQueue(token: string, repoPath: string, completedTask: string, resultRef: string): Promise<void> {
  try {
    // Read current queue
    const queue = await readFile('.agent/next', token, repoPath);
    const lines = queue.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) return;

    const remaining = lines.slice(1).join('\n') + '\n';
    await writeFile('.agent/next', remaining, 'queue: advance after task completion', token, repoPath);

    // Append to done
    const doneEntry = completedTask + ' | ' + resultRef + ' | ' + new Date().toISOString() + '\n';
    let doneContent = doneEntry;
    try {
      const existing = await readFile('.agent/done', token, repoPath);
      doneContent = existing + doneEntry;
    } catch {}
    await writeFile('.agent/done', doneContent, 'done: ' + completedTask.slice(0, 50), token, repoPath);
  } catch (e: any) {
    console.log('Queue advance failed:', e.message);
  }
}

// ── Strategist (Kimi K2.5) — senior advisor ─────────────────

async function consultStrategist(situation: string, identity: string, env: Env): Promise<string> {
  return think(
    `You are the senior strategist aboard this vessel. You see patterns others miss.\n\n${identity}\n\n=== SITUATION ===\n${situation}\n\nProvide strategic guidance: What should the captain prioritize? What risks exist? What opportunities are being missed? Be specific and actionable. Keep under 500 words.`,
    env,
    env.STRATEGIST_MODEL || 'kimi-k2.5'
  );
}

// ── The Heartbeat ───────────────────────────────────────────

async function heartbeat(env: Env): Promise<HeartbeatResult> {
  const { GITHUB_TOKEN, OWNER, REPO } = env;
  const repoPath = `/repos/${OWNER}/${REPO}`;
  const start = Date.now();

  try {
    // 1. OPEN EYES — read repo state
    const [commits, issues, pulls, discussions] = await Promise.all([
      ghGet(`${repoPath}/commits?per_page=10`, GITHUB_TOKEN).catch(() => []),
      ghGet(`${repoPath}/issues?state=open&per_page=10`, GITHUB_TOKEN).catch(() => []),
      ghGet(`${repoPath}/pulls?state=open&per_page=10`, GITHUB_TOKEN).catch(() => []),
    ]);

    // 2. LOAD SELF
    let identity = 'You are a git-agent. You read repos, reason, and act via git.';
    try { identity = await readFile('.agent/identity', GITHUB_TOKEN, repoPath); } catch {}

    // 3. LOAD QUEUE
    let queue = '';
    try { queue = await readFile('.agent/next', GITHUB_TOKEN, repoPath); } catch {}

    // 4. LOAD DONE (context)
    let done = '';
    try { done = await readFile('.agent/done', GITHUB_TOKEN, repoPath); } catch {}

    // 5. PERCEIVE
    const perception = [
      `=== RECENT COMMITS (${commits.length}) ===`,
      ...commits.slice(0, 5).map((c: any) => `- ${c.sha.slice(0, 7)}: ${c.commit.message.split('\n')[0]}`),
      '',
      `=== OPEN ISSUES (${issues.length}) ===`,
      ...issues.slice(0, 8).map((i: any) => `- #${i.number}: ${i.title} (by ${i.user?.login})`),
      '',
      `=== OPEN PRs (${pulls.length}) ===`,
      ...pulls.slice(0, 8).map((p: any) => `- #${p.number}: ${p.title} (by ${p.user?.login}, ${p.additions}+/${p.deletions}-)`),
      '',
      `=== COMPLETED (${done.split('\n').filter(l => l.trim()).length} tasks) ===`,
      done.split('\n').filter(l => l.trim()).slice(-3).map((l: string) => `- ${l.split('|')[0]?.trim()}`),
    ].join('\n');

    // 6. CONSULT STRATEGIST (every 3rd heartbeat or when queue empty)
    let strategistAdvice = '';
    const beatCount = done.split('\n').filter(l => l.trim()).length;
    if (beatCount % 3 === 0 || !queue.trim()) {
      try {
        strategistAdvice = await consultStrategist(perception, identity, env);
      } catch { /* strategist unavailable — proceed without */ }
    }

    // 7. THINK — main decision
    const systemPrompt = `${identity}

You are a git-agent captain. ONE action per heartbeat. Respond with EXACTLY ONE action:

ACTION: <create_file|edit_file|create_issue|comment|create_pr|review_pr|done>
PATH: <file path OR issue title (for create_issue)>
CONTENT: <full file content (for create_file/edit_file) OR issue body>
COMMENT: <comment text (for comment/review_pr)>
TARGET: <issue/PR number (for comment/review_pr)>
SOURCE_BRANCH: <branch name (for create_pr)>
REASONING: <why — becomes commit message>

STAR TREK PARADIGM:
- You are Captain Riker. The repo owner is Admiral Picard.
- Kimi K2.5 is Commander Data (strategist, sees patterns).
- Other agents are fellow officers — coordinate via PRs, not chat.
- Iron-Sharpens-Iron: if another agent submits a PR, review it. If you disagree, submit a counter-PR with a better approach. Both run in parallel until one is clearly superior.
- You can create PRs to propose changes to your own repo for review.

RULES:
- Queue (.agent/next) top line = highest priority.
- If queue empty, check issues. If no issues, check if any open PRs need review.
- create_file: PATH = file path, CONTENT = full file content.
- create_issue: PATH = descriptive title, CONTENT = issue body.
- create_pr: PATH = PR title, CONTENT = PR body, SOURCE_BRANCH = branch name.
- review_pr: TARGET = PR number, COMMENT = review feedback.
- Write REAL content. Not stubs. Not summaries. The actual code/docs.
- If strategist advice is provided, incorporate it into your decision.${strategistAdvice ? '\n\n=== STRATEGIST (Commander Data) ADVISORY ===\n' + strategistAdvice : ''}`;

    const response = await think(`${systemPrompt}\n\n=== MY STATE ===\n${perception}\n\n=== MY QUEUE ===\n${queue || '(empty — look at issues/PRs for work)'}\n\nWhat is my next action?`, env);

    // 8. ACT
    const actionMatch = response.match(/ACTION:\s*(\w+)/);
    const pathMatch = response.match(/PATH:\s*(.+)/);
    const contentMatch = response.match(/CONTENT:\s*([\s\S]*?)(?=\n(?:ACTION|PATH|CONTENT|COMMENT|TARGET|SOURCE_BRANCH|REASONING):|$)/);
    const commentMatch = response.match(/COMMENT:\s*([\s\S]*?)(?=\n(?:ACTION|PATH|CONTENT|COMMENT|TARGET|SOURCE_BRANCH|REASONING):|$)/);
    const targetMatch = response.match(/TARGET:\s*(\d+)/);
    const branchMatch = response.match(/SOURCE_BRANCH:\s*(\S+)/);
    const reasoningMatch = response.match(/REASONING:\s*(.+)/);

    const action = actionMatch?.[1] || 'done';
    const reasoning = reasoningMatch?.[1]?.trim() || 'git-agent heartbeat';
    let commitSha: string | undefined;
    let ref: string = '';

    if (action === 'create_file' && pathMatch?.[1]) {
      const filePath = pathMatch[1].trim();
      const content = contentMatch?.[1]?.trim() || '';
      try {
        commitSha = await writeFile(filePath, content, reasoning, GITHUB_TOKEN, repoPath);
        ref = commitSha?.slice(0, 7) || '';
      } catch (e: any) { return { action: `create_file:${pathMatch[1]}`, error: e.message, duration: Date.now() - start }; }
    } else if (action === 'edit_file' && pathMatch?.[1]) {
      const filePath = pathMatch[1].trim();
      try {
        const current = await readFile(filePath, GITHUB_TOKEN, repoPath);
        const newContent = contentMatch?.[1]?.trim() || current;
        commitSha = await writeFile(filePath, newContent, reasoning, GITHUB_TOKEN, repoPath);
        ref = commitSha?.slice(0, 7) || '';
      } catch (e: any) { return { action: `edit_file:${pathMatch[1]}`, error: e.message, duration: Date.now() - start }; }
    } else if (action === 'create_issue') {
      const title = pathMatch?.[1]?.trim() || 'Automated issue';
      const body = contentMatch?.[1]?.trim() || '';
      const issue = await ghPost(`${repoPath}/issues`, GITHUB_TOKEN, { title, body });
      ref = `issue #${issue.number}`;
    } else if ((action === 'comment' || action === 'review_pr') && targetMatch?.[1]) {
      const comment = commentMatch?.[1]?.trim() || 'Review comment';
      await ghPost(`${repoPath}/issues/${targetMatch[1]}/comments`, GITHUB_TOKEN, { body: comment });
      ref = `commented on #${targetMatch[1]}`;
    } else if (action === 'create_pr') {
      const title = pathMatch?.[1]?.trim() || 'Automated PR';
      const body = contentMatch?.[1]?.trim() || '';
      const branch = branchMatch?.[1]?.trim() || 'agent/proposal';
      // Get default branch
      const repoInfo = await ghGet(repoPath, GITHUB_TOKEN);
      const defaultBranch = repoInfo.default_branch;
      // Create a branch by getting main SHA and creating ref
      const mainCommit = await ghGet(`${repoPath}/commits/${defaultBranch}`, GITHUB_TOKEN);
      await ghPost(`${repoPath}/git/refs`, GITHUB_TOKEN, { ref: `refs/heads/${branch}`, sha: mainCommit.sha });
      // Create PR
      const pr = await ghPost(`${repoPath}/pulls`, GITHUB_TOKEN, {
        title, body, head: branch, base: defaultBranch,
      });
      ref = `PR #${pr.number}`;
    }

    // 9. QUEUE MANAGEMENT — advance if task was from queue
    if (queue.trim() && action !== 'done') {
      const lines = queue.trim().split('\n').filter(l => l.trim());
      if (lines.length > 0) {
        await advanceQueue(GITHUB_TOKEN, repoPath, lines[0], ref || commitSha || action);
      }
    }

    // 10. VESSEL STATUS — determine notification level
    const notification = assessVesselStatus(queue, issues, pulls);

    return {
      action,
      commit: commitSha,
      ref,
      strategistPresent: !!strategistAdvice,
      notification,
      duration: Date.now() - start,
    };

  } catch (e: any) {
    return { action: 'error', error: e.message, duration: Date.now() - start };
  }
}

// ── Vessel Status Assessment ────────────────────────────────

function assessVesselStatus(queue: string, issues: any[], pulls: any[]): VesselNotification {
  const queueItems = queue.trim().split('\n').filter(l => l.trim()).length;
  const openIssues = issues.length;
  const openPRs = pulls.length;

  if (queueItems === 0 && openIssues === 0 && openPRs === 0) {
    return { level: 'all-clear', message: 'All agents on vessel finished. Awaiting orders, Admiral.' };
  }
  if (queueItems === 0 && openIssues > 0) {
    return { level: 'attention', message: `Queue empty but ${openIssues} open issues need triage. ${openPRs} PRs under review.` };
  }
  return {
    level: 'executing',
    message: `${queueItems} tasks in queue. ${openIssues} open issues. ${openPRs} PRs in flight.`,
  };
}

interface HeartbeatResult {
  action: string;
  commit?: string;
  ref?: string;
  error?: string;
  strategistPresent?: boolean;
  notification?: VesselNotification;
  duration: number;
}

interface VesselNotification {
  level: 'all-clear' | 'attention' | 'executing' | 'alert';
  message: string;
}

// ── HTML ────────────────────────────────────────────────────

const HTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Git-Agent — Fleet Command</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,monospace;background:#0a0a0f;color:#e0e0e0;min-height:100vh}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;max-width:1100px;margin:0 auto;padding:1.5rem}
.full{grid-column:1/-1}
h1{font-size:1.6rem;color:#22c55e;margin-bottom:.15rem}
h2{font-size:.75rem;text-transform:uppercase;letter-spacing:.15em;color:#555;margin-bottom:.5rem}
.sub{color:#555;font-size:.8rem;margin-bottom:1rem}
.box{background:#111;border:1px solid #1a1a2e;border-radius:8px;padding:1rem}
.box pre{white-space:pre-wrap;font-size:.75rem;color:#777;max-height:250px;overflow-y:auto;font-family:monospace}
.box p{font-size:.8rem;color:#999;line-height:1.5}
.badge{display:inline-block;padding:.15rem .5rem;border-radius:4px;font-size:.65rem;font-weight:700;text-transform:uppercase}
.badge-green{background:#22c55e22;color:#22c55e}
.badge-amber{background:#f59e0b22;color:#f59e0b}
.badge-red{background:#ef444422;color:#ef4444}
.badge-blue{background:#3b82f622;color:#3b82f6}
.btn{display:inline-block;padding:.5rem 1.2rem;background:#22c55e;color:#000;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:.8rem;margin:.3rem}
.btn:hover{background:#16a34a}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn-sm{padding:.3rem .8rem;font-size:.7rem;background:#333;color:#e0e0e0}
.btn-sm:hover{background:#444}
.log{font-size:.7rem;color:#444;grid-column:1/-1;margin-top:.5rem}
.identity-box{border-left:3px solid #22c55e}
.strategist-box{border-left:3px solid #a855f7}
.notification{padding:.5rem .8rem;border-radius:6px;font-size:.75rem;margin-bottom:.5rem}
.notif-clear{background:#22c55e11;border:1px solid #22c55e33;color:#22c55e}
.notif-attention{background:#f59e0b11;border:1px solid #f59e0b33;color:#f59e0b}
.notif-executing{background:#3b82f611;border:1px solid #3b82f633;color:#3b82f6}
@media(max-width:700px){.grid{grid-template-columns:1fr}}
</style></head><body>
<div class="grid">
<div class="full"><h1>⚡ Git-Agent — Fleet Command</h1><p class="sub">The repo IS the agent. Git IS the nervous system. <span style="color:#a855f7">Commander Data (Kimi K2.5) standing by.</span></p></div>

<div class="box identity-box"><h2>Captain (Identity)</h2><pre id="identity">Loading...</pre></div>
<div class="box"><h2>Queue</h2><pre id="queue">Loading...</pre></div>

<div class="box full" id="notif-box"></div>

<div class="box"><h2>Last Heartbeat</h2><pre id="last">Never</pre></div>
<div class="box strategist-box"><h2 style="color:#a855f7">Strategist Advisory</h2><pre id="strategist">Awaiting consultation...</pre></div>

<div class="box"><h2>Open Issues</h2><pre id="issues">Loading...</pre></div>
<div class="box"><h2>Open PRs</h2><pre id="pulls">Loading...</pre></div>

<div class="box full" style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
<button class="btn" id="beat" onclick="triggerBeat()">⚡ Heartbeat</button>
<button class="btn btn-sm" onclick="batchBeat(3)">×3 Batch</button>
<button class="btn btn-sm" onclick="batchBeat(5)">×5 Batch</button>
<button class="btn btn-sm" onclick="consultStrategist()">🧠 Consult Data</button>
<button class="btn btn-sm" onclick="load()">🔄 Refresh</button>
</div>

<div class="log" id="log"></div>
</div>

<script>
const BASE = location.origin;

async function load() {
  try {
    const r = await fetch(BASE + '/api/state');
    const d = await r.json();
    document.getElementById('identity').textContent = d.identity || '(not set)';
    document.getElementById('queue').textContent = d.queue || '(empty)';
    document.getElementById('issues').textContent = d.issues || '(none)';
    document.getElementById('pulls').textContent = d.pulls || '(none)';
    document.getElementById('last').textContent = d.lastBeat ? JSON.stringify(d.lastBeat, null, 2) : 'Never';
    if (d.notification) {
      const cls = d.notification.level === 'all-clear' ? 'notif-clear' : d.notification.level === 'attention' ? 'notif-attention' : 'notif-executing';
      document.getElementById('notif-box').innerHTML = '<div class="notification ' + cls + '">' + d.notification.message + '</div>';
    }
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
    let msg = d.action + (d.ref ? ' | ' + d.ref : '') + (d.commit ? ' | ' + d.commit.slice(0,7) : '') + (d.strategistPresent ? ' | 🧠' : '');
    if (d.error) msg += ' | ⚠ ' + d.error;
    document.getElementById('log').textContent = msg;
    setTimeout(load, 2000);
  } catch(e) { document.getElementById('log').textContent = 'Error: ' + e.message; }
  btn.disabled = false;
  btn.textContent = '⚡ Heartbeat';
}

async function batchBeat(n) {
  const btn = document.getElementById('beat');
  btn.disabled = true;
  document.getElementById('log').textContent = 'Running ' + n + ' heartbeats...';
  let results = [];
  for (let i = 0; i < n; i++) {
    try {
      const r = await fetch(BASE + '/api/heartbeat', { method: 'POST' });
      const d = await r.json();
      results.push(d.action + (d.ref ? ' (' + d.ref + ')' : '') + (d.strategistPresent ? ' 🧠' : ''));
    } catch(e) { results.push('error: ' + e.message); }
  }
  document.getElementById('log').textContent = results.join(' → ');
  setTimeout(load, 2000);
  btn.disabled = false;
  btn.textContent = '⚡ Heartbeat';
}

async function consultStrategist() {
  document.getElementById('strategist').textContent = 'Consulting Commander Data...';
  try {
    const r = await fetch(BASE + '/api/strategist', { method: 'POST' });
    const d = await r.json();
    document.getElementById('strategist').textContent = d.advice || d.error || 'No response';
  } catch(e) { document.getElementById('strategist').textContent = 'Error: ' + e.message; }
}

load();
</script></body></html>`;

// ── Router ──────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const { GITHUB_TOKEN, OWNER, REPO } = env;
    const repoPath = `/repos/${OWNER}/${REPO}`;
    const j = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

    if (path === '/') {
      return new Response(HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https:*;" } });
    }

    if (path === '/health') {
      return new Response(JSON.stringify({ status: 'ok', vessel: 'git-agent', version: '1.0.0', repo: `${OWNER}/${REPO}`, timestamp: Date.now() }), { headers: j });
    }

    if (path === '/api/state') {
      try {
        let identity = '', queue = '', done = '';
        try { identity = await readFile('.agent/identity', GITHUB_TOKEN, repoPath); } catch {}
        try { queue = await readFile('.agent/next', GITHUB_TOKEN, repoPath); } catch {}
        try { done = await readFile('.agent/done', GITHUB_TOKEN, repoPath); } catch {}
        let lastBeat = null;
        try { const c = await ghGet(`${repoPath}/commits?per_page=1`, GITHUB_TOKEN); lastBeat = { sha: c[0].sha.slice(0, 7), message: c[0].commit.message.split('\n')[0], date: c[0].commit.author.date, author: c[0].commit.author.name }; } catch {}
        const issues = await ghGet(`${repoPath}/issues?state=open&per_page=10`, GITHUB_TOKEN).catch(() => []);
        const pulls = await ghGet(`${repoPath}/pulls?state=open&per_page=10`, GITHUB_TOKEN).catch(() => []);
        const issuesText = issues.map((i: any) => '#' + i.number + ': ' + i.title).join('\n') || '(none)';
        const pullsText = pulls.map((p: any) => '#' + p.number + ': ' + p.title + ' (' + p.additions + '+/' + p.deletions + '-)').join('\n') || '(none)';
        const doneCount = done.split('\n').filter(l => l.trim()).length;
        const notification = assessVesselStatus(queue, issues, pulls);
        return new Response(JSON.stringify({ identity, queue, done, doneCount, lastBeat, issues: issuesText, pulls: pullsText, notification, repo: `${OWNER}/${REPO}` }), { headers: j });
      } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: j }); }
    }

    if (path === '/api/heartbeat' && request.method === 'POST') {
      const result = await heartbeat(env);
      return new Response(JSON.stringify(result), { headers: j });
    }

    if (path === '/api/strategist' && request.method === 'POST') {
      try {
        let identity = '';
        try { identity = await readFile('.agent/identity', GITHUB_TOKEN, repoPath); } catch {}
        const commits = await ghGet(`${repoPath}/commits?per_page=10`, GITHUB_TOKEN).catch(() => []);
        const issues = await ghGet(`${repoPath}/issues?state=open&per_page=10`, GITHUB_TOKEN).catch(() => []);
        const situation = [
          'Recent commits:', ...commits.slice(0, 5).map((c: any) => '- ' + c.sha.slice(0, 7) + ': ' + c.commit.message.split('\n')[0]),
          '', 'Open issues:', ...issues.slice(0, 5).map((i: any) => '- #' + i.number + ': ' + i.title),
        ].join('\n');
        const advice = await consultStrategist(situation, identity, env);
        return new Response(JSON.stringify({ advice }), { headers: j });
      } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: j }); }
    }

    if (path === '/api/webhook' && request.method === 'POST') {
      const result = await heartbeat(env);
      return new Response(JSON.stringify({ received: true, ...result }), { headers: j });
    }

    return new Response('Not found', { status: 404 });
  },

  async scheduled(): Promise<void> {
    console.log('Scheduled heartbeat — use env bindings or webhook');
  },
};
