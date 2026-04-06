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
  // Keeper memory
  MEMORY: KVNamespace;
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

// ── Keeper Memory System (hot/warm/cold tiers) ─────────────
// Hot: last 10 heartbeats (1-2 hours). Warm: last 7 days.
// Cold: patterns and lessons from all time. GC promotes/demotes.

interface KeeperLesson {
  type: 'error' | 'success' | 'pattern' | 'constraint';
  content: string;
  context: string;
  heartbeatId: number;
  confidence: number;
  applications: number;
}

interface KeeperHotEntry {
  heartbeat: number;
  action: string;
  ref: string;
  reasoning: string;
  duration: number;
  timestamp: number;
}

async function keeperRemember(env: Env, entry: KeeperHotEntry, action: string, error?: string): Promise<void> {
  const kv = env.MEMORY;
  const now = Date.now();

  // 1. Store in hot ring (last 10)
  const hotKey = 'hot:' + entry.heartbeat;
  await kv.put(hotKey, JSON.stringify(entry), { expirationTtl: 7200 }); // 2h TTL

  // Update hot index
  let hotIndex: string[] = [];
  try { hotIndex = JSON.parse(await kv.get('hot_index') || '[]'); } catch {}
  hotIndex.push(hotKey);
  if (hotIndex.length > 10) {
    // Evict oldest to warm
    const evicted = hotIndex.shift();
    if (evicted) {
      try {
        const evictedData = JSON.parse(await kv.get(evicted) || '{}');
        await kv.put('warm:' + evictedData.heartbeat, JSON.stringify(evictedData), { expirationTtl: 604800 }); // 7d TTL
        await kv.delete(evicted);
      } catch {}
    }
  }
  await kv.put('hot_index', JSON.stringify(hotIndex));

  // 2. Extract lessons from errors and patterns
  if (error) {
    await keeperAddLesson(kv, {
      type: 'error',
      content: error.slice(0, 200),
      context: 'Action: ' + action,
      heartbeatId: entry.heartbeat,
      confidence: 0.5,
      applications: 0,
    });
  }

  // 3. Track action patterns
  const patternKey = 'pattern:' + action;
  const currentCount = parseInt(await kv.get(patternKey) || '0');
  await kv.put(patternKey, String(currentCount + 1));
  if (currentCount >= 5) {
    await keeperAddLesson(kv, {
      type: 'pattern',
      content: 'Frequently performs action: ' + action + ' (' + (currentCount + 1) + ' times)',
      context: 'Behavioral pattern detected',
      heartbeatId: entry.heartbeat,
      confidence: 0.8,
      applications: 0,
    });
  }
}

async function keeperAddLesson(kv: KVNamespace, lesson: KeeperLesson): Promise<void> {
  const id = 'lesson:' + Date.now() + ':' + Math.random().toString(36).slice(2, 6);
  await kv.put(id, JSON.stringify(lesson));

  // Update lesson index
  let lessons: string[] = [];
  try { lessons = JSON.parse(await kv.get('lesson_index') || '[]'); } catch {}
  lessons.push(id);
  await kv.put('lesson_index', JSON.stringify(lessons));
}

async function keeperRecall(kv: KVNamespace, context: string): Promise<string> {
  const parts: string[] = [];

  // Hot: last 3 entries
  let hotIndex: string[] = [];
  try { hotIndex = JSON.parse(await kv.get('hot_index') || '[]'); } catch {}
  const recentHot = hotIndex.slice(-3);
  for (const key of recentHot) {
    try {
      const entry = JSON.parse(await kv.get(key) || '{}');
      parts.push('- [' + entry.action + '] ' + (entry.ref || '') + ' (' + Math.round(entry.duration) + 'ms)');
    } catch {}
  }
  if (parts.length) parts.unshift('=== RECENT ACTIONS (hot) ===');

  // Cold: relevant lessons
  let lessons: string[] = [];
  try { lessons = JSON.parse(await kv.get('lesson_index') || '[]'); } catch {}
  const ctxLow = context.toLowerCase();
  const relevant: string[] = [];
  for (const id of lessons.slice(-20)) { // check last 20 lessons
    try {
      const lesson = JSON.parse(await kv.get(id) || '{}');
      if (lesson.content.toLowerCase().includes(ctxLow.split(' ').find(w => w.length > 4) || '')) {
        relevant.push('[' + lesson.type + '] ' + lesson.content);
      }
    } catch {}
  }
  if (relevant.length) {
    parts.push('');
    parts.push('=== RELEVANT LESSONS (cold) ===');
    parts.push(...relevant.slice(0, 3));
  }

  // Pattern stats
  const patternKeys = (await kv.list({ prefix: 'pattern:' })).keys;
  if (patternKeys.length > 0) {
    parts.push('');
    parts.push('=== ACTION PATTERNS ===');
    for (const pk of patternKeys.slice(-5)) {
      const count = await kv.get(pk.name);
      const action = pk.name.replace('pattern:', '');
      if (count && parseInt(count) >= 3) parts.push('- ' + action + ': ' + count + 'x');
    }
  }

  return parts.join('\n');
}

async function keeperGC(kv: KVNamespace): Promise<{ cleaned: number }> {
  let cleaned = 0;
  // Clean expired hot entries from index
  let hotIndex: string[] = [];
  try { hotIndex = JSON.parse(await kv.get('hot_index') || '[]'); } catch {}
 const valid: string[] = [];
  for (const key of hotIndex) {
    if (await kv.get(key)) { valid.push(key); } else { cleaned++; }
  }
  if (valid.length !== hotIndex.length) {
    await kv.put('hot_index', JSON.stringify(valid));
  }
  return { cleaned };
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
    const keeperContext = await keeperRecall(env.MEMORY, queue || 'idle');
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

    const response = await think(`${systemPrompt}\n\n=== MY STATE ===\n${perception}\n\n=== KEEPER MEMORY ===\n${keeperContext || '(no memories yet)'}\n\n=== MY QUEUE ===\n${queue || '(empty — look at issues/PRs for work)'}\n\nWhat is my next action?`, env);

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

    // 9. MISSION LOG — append to captain's log
    try {
      const logEntry = `## Heartbeat ${Date.now()}
- **Action**: ${action} ${ref || ''}
- **Reasoning**: ${reasoning}
- **Strategist**: ${strategistAdvice ? 'Consulted' : 'Not consulted'}
- **Duration**: ${Date.now() - start}ms
- **Notification**: ${assessVesselStatus(queue, issues, pulls).message}

`;
      let logContent = logEntry;
      try { logContent = await readFile('docs/mission-log.md', GITHUB_TOKEN, repoPath) + logEntry; } catch {}
      await writeFile('docs/mission-log.md', logContent, 'log: heartbeat ' + action, GITHUB_TOKEN, repoPath);
    } catch (e: any) { console.log('Mission log failed:', e.message); }

    // 10. QUEUE MANAGEMENT — advance if task was from queue
    if (queue.trim() && action !== 'done') {
      const lines = queue.trim().split('\n').filter(l => l.trim());
      if (lines.length > 0) {
        await advanceQueue(GITHUB_TOKEN, repoPath, lines[0], ref || commitSha || action);
      }
    }

    // 10. VESSEL STATUS — determine notification level
    const notification = assessVesselStatus(queue, issues, pulls);

    // 11. KEEPER MEMORY — remember this heartbeat
    const beatNum = done.split('\n').filter(l => l.trim()).length + 1;
    await keeperRemember(env, {
      heartbeat: beatNum,
      action,
      ref: ref || '',
      reasoning,
      duration: Date.now() - start,
      timestamp: Date.now(),
    }, action);

    return {
      action,
      commit: commitSha,
      ref,
      strategistPresent: !!strategistAdvice,
      notification,
      keeperEntries: beatNum,
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
  if (path === '/vessel.json') { try { const vj = await import('./vessel.json', { with: { type: 'json' } }); return new Response(JSON.stringify(vj.default || vj), { headers: { 'Content-Type': 'application/json' } }); } catch { return new Response('{}', { headers: { 'Content-Type': 'application/json' } }); } }

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

    if (path === '/api/keeper/stats') {
      try {
        const hotIndex = JSON.parse(await env.MEMORY.get('hot_index') || '[]');
        const lessonIndex = JSON.parse(await env.MEMORY.get('lesson_index') || '[]');
        const patterns = (await env.MEMORY.list({ prefix: 'pattern:' })).keys;
        return new Response(JSON.stringify({
          hotEntries: hotIndex.length,
          lessons: lessonIndex.length,
          patterns: patterns.length,
          totalMemories: hotIndex.length + lessonIndex.length,
        }), { headers: j });
      } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: j }); }
    }

    if (path === '/api/keeper/recall') {
      try {
        const url = new URL(request.url);
        const context = url.searchParams.get('q') || 'recent';
        const memories = await keeperRecall(env.MEMORY, context);
        return new Response(JSON.stringify({ context, memories }), { headers: j });
      } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: j }); }
    }

    // ── Boot Camp: Ground Truth Assessment ──
    if (path === '/api/bootcamp/assess' && request.method === 'POST') {
      try {
        // Captain probes its own ship
        const contents = await ghGet(`${repoPath}/contents/`, GITHUB_TOKEN);
        const fileCount = Array.isArray(contents) ? contents.length : 0;
        const hasWrangler = Array.isArray(contents) && contents.some((f: any) => f.name === 'wrangler.toml');
        const hasPackage = Array.isArray(contents) && contents.some((f: any) => f.name === 'package.json');
        const hasAgent = Array.isArray(contents) && contents.some((f: any) => f.name === '.agent' || f.name === 'CLAUDE.md' || f.name === 'AGENT.md');
        const hasDocker = Array.isArray(contents) && contents.some((f: any) => f.name === 'Dockerfile');
        const hasDevcontainer = Array.isArray(contents) && contents.some((f: any) => f.name === '.devcontainer');
        const languages = await ghGet(`${repoPath}/languages`, GITHUB_TOKEN).catch(() => ({}));
        const langList = Object.keys(languages).join(', ') || 'unknown';
        const commitCount = await ghGet(`${repoPath}/commits?per_page=1`, GITHUB_TOKEN).catch(() => []);
        // Get total commit count from header if available, else approximate
        let totalCommits = 0;
        try { const c = await fetch(`${GH_API}${repoPath}/commits?per_page=1`, { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } }); const link = c.headers.get('link'); if (link) { const m = link.match(/page=(\d+)>; rel="last"/); if (m) totalCommits = parseInt(m[1]); } } catch {}
        if (totalCommits === 0 && commitCount.length > 0) totalCommits = 1;

        // Determine vessel type
        const vesselType = hasWrangler ? 'cloudflare-worker' : hasDocker ? 'docker-container' : hasPackage ? 'node-app' : 'bare-repo';

        // Determine boot camp phase
        let phase = 'phase-0-untie';
        if (hasAgent) phase = 'phase-1-ground-truth';
        try { const gt = await readFile('.agent/ground-truth', GITHUB_TOKEN, repoPath); if (gt.trim().length > 0) phase = 'phase-2-building'; } catch {}
        try { const sk = await readFile('.agent/skills/maintenance', GITHUB_TOKEN, repoPath); if (sk.trim().length > 0) phase = 'phase-3-skills-distilled'; } catch {}

        const assessment = {
          vessel: `${OWNER}/${REPO}`,
          vesselType,
          bootCampPhase: phase,
          specs: { fileCount, totalCommits, languages: langList, hasWrangler, hasPackage, hasDocker, hasDevcontainer, hasAgent },
          groundTruth: {
            status: hasAgent ? 'detected' : 'no .agent/ directory',
            phase,
            recommendation: !hasAgent ? 'Run boot camp: create .agent/identity and .agent/ground-truth' : phase === 'phase-1-ground-truth' ? 'Human should review and confirm ground truth' : 'Ground truth established. Captain operational.',
          },
        };
        return new Response(JSON.stringify(assessment), { headers: j });
      } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: j }); }
    }

    // ── Boot Camp: Set Ground Truth ──
    if (path === '/api/bootcamp/ground-truth' && request.method === 'POST') {
      try {
        const body = await request.json();
        const specs = body.specs || {};
        const corrections = body.corrections || '';
        const timestamp = new Date().toISOString();
        const content = `# Ground Truth Log\n\nShip: ${OWNER}/${REPO}\nAssessed: ${timestamp}\n\n## Vessel Specs\n` +
          Object.entries(specs).map(([k, v]) => `- ${k}: ${v}`).join('\n') +
          `\n\n## Human Corrections\n${corrections || '(none — captain\'s assessment confirmed)'}\n\n## Status\nLOCKED — ground truth confirmed by human.\n`;
        await writeFile('.agent/ground-truth', content, GITHUB_TOKEN, repoPath);
        return new Response(JSON.stringify({ status: 'ground-truth-locked', content }), { headers: j });
      } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: j }); }
    }

    // ── Boot Camp: Distill Skill ──
    if (path === '/api/bootcamp/skill' && request.method === 'POST') {
      try {
        const body = await request.json();
        const skillName = body.name || 'maintenance';
        const skillContent = body.content || '';
        if (!skillContent.trim()) return new Response(JSON.stringify({ error: 'content required' }), { status: 400, headers: j });
        await writeFile(`.agent/skills/${skillName}`, skillContent, GITHUB_TOKEN, repoPath);
        return new Response(JSON.stringify({ status: 'skill-distilled', name: skillName, path: `.agent/skills/${skillName}` }), { headers: j });
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
