#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
// Git-Agent TUI v2.1 — The Bridge
// Terminal-first agent interface with human intervention alerts
//
// Modes: onboard | tui (default) | cli | shell | watch
//
// Superinstance & Lucineer (DiGennaro et al.) — 2026-04-04
// ═══════════════════════════════════════════════════════════════════

import { createInterface } from 'readline';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, appendFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = process.cwd();

// ── ANSI Colors (no deps) ───────────────────────────────────
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  teal: '\x1b[38;2;0;230;214m', green: '\x1b[38;2;31;203;88m',
  gray: '\x1b[38;2;138;147;180m', white: '\x1b[38;2;216;216;236m',
  red: '\x1b[38;2;255;100;100m', yellow: '\x1b[38;2;245;158;11m',
  bg: '\x1b[48;2;10;10;15m', invert: '\x1b[7m',
};
const b = (t, c = C.white) => `${c}${t}${C.reset}`;
const dim = t => b(t, C.dim);
const teal = t => b(t, C.teal);
const green = t => b(t, C.green);
const gray = t => b(t, C.gray);
const red = t => b(t, C.red);
const yellow = t => b(t, C.yellow);
const bold = t => b(t, C.bold);
const inv = t => b(t, C.invert);

// ── ASCII Art ───────────────────────────────────────────────
const LOGO = `
${teal('    ╱╲')}
${teal('   ╱  ╲')}${gray('     ┌─┐')}
${teal('  ╱    ╲')}${gray('    │ │')}${dim(' ⚡')}
${teal(' ╱  ╱╲  ╲')}${gray('   │ │')}
${teal('╱  ╱  ╲  ╲')}${gray('  └─┘')}
${teal('╲  ╲  ╱  ╱')}
${teal(' ╲  ╲╱  ╱')}
${teal('  ╲    ╱')}
${teal('   ╲  ╱')}
${teal('    ╲╱')}
`;

// ── Helpers ─────────────────────────────────────────────────
function ask(question, opts = {}) {
  const { default: def, password = false, choices } = opts;
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    let prompt = `\n${teal('  ›')} ${gray(question)}`;
    if (def) prompt += dim(` (${def})`);
    prompt += ' ';
    if (password) {
      const stdin = process.stdin;
      stdin.setRawMode?.(true);
      stdin.resume?.();
      process.stdout.write(prompt);
      let buf = '';
      stdin.on('data', (d) => {
        const ch = d.toString();
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode?.(false);
          stdin.pause?.();
          rl.close();
          process.stdout.write('\n');
          resolve(buf || def || '');
        } else if (ch === '\x7f' || ch === '\x08') {
          buf = buf.slice(0, -1);
          process.stdout.write('\b \b');
        } else {
          buf += ch;
          process.stdout.write('*');
        }
      });
      return;
    }
    rl.question(prompt, answer => {
      rl.close();
      const val = answer.trim() || def || '';
      if (choices && val && !choices.includes(val)) {
        console.log(red(`  Invalid. Options: ${choices.join(', ')}`));
        return resolve(ask(question, opts));
      }
      resolve(val);
    });
  });
}

function section(title) {
  console.log(`\n${teal(bold('  ─── ' + title + ' ───'))}`);
}

function writeFile(path, content) {
  const full = join(REPO_ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

function readFile(path) {
  try { return readFileSync(join(REPO_ROOT, path), 'utf-8'); } catch { return null; }
}

function appendFile(path, content) {
  const full = join(REPO_ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  appendFileSync(full, content + '\n');
}

function fileExists(path) { return existsSync(join(REPO_ROOT, path)); }
function hasCommand(cmd) { try { execSync(`which ${cmd}`, { stdio: 'pipe' }); return true; } catch { return false; } }

// ── Intervention System ─────────────────────────────────────
// The agent can request human intervention for auth-sensitive operations.
// The human sees the alert, takes action, and presses Enter to continue.

async function admiralIntervention(config) {
  console.log('');
  console.log(teal(bold('  ⚡ ADMIRAL INTERVENTION REQUIRED')));
  console.log(teal('  ═══════════════════════════════════════'));
  console.log('');
  console.log(gray(`  Action: ${config.action}`));
  if (config.url) console.log(gray(`  URL:    ${config.url}`));
  if (config.reason) console.log(gray(`  Reason: ${config.reason}`));
  if (config.hint) console.log(dim(`  Hint:   ${config.hint}`));
  console.log('');
  console.log(dim('  The agent will wait here. Take the action above,'));
  console.log(dim('  then press Enter to continue.'));
  console.log('');
  await ask('Press Enter when done...');
  return true;
}

// ── Onboarding (same as v2.0, streamlined) ──────────────────
async function onboard() {
  console.clear();
  console.log(LOGO);
  console.log(teal(bold('  Git-Agent')) + dim(' v2.1 — The Bridge'));
  console.log(gray('  Fork → Codespaces → alive.'));
  console.log('');
  console.log(dim('  This wizard configures your agent. No code editing needed.'));
  await ask('Press Enter to begin...');

  const total = 6;
  let current = 0;

  // Step 1: Identity
  section(`${++current}/${total} Agent Identity`);
  const agentName = await ask('Agent name', { default: readFile('.agent/identity')?.match(/Name: (.+)/)?.[1] || 'Flux' });
  const domain = await ask('Domain', { default: readFile('.agent/identity')?.match(/Domain: (.+)/)?.[1] || 'general-purpose' });
  const personality = await ask('Personality', { choices: ['precise', 'warm', 'creative', 'technical', 'casual'], default: 'precise' });

  writeFile('.agent/identity', `# ${agentName}
## Identity
- Name: ${agentName}
- Domain: ${domain}
- Personality: ${personality}
- Created: ${new Date().toISOString().split('T')[0]}

## Mission
You are ${agentName}, a git-native repo-agent. The repo IS the agent.
You improve through pull requests. You coordinate via git.

## Behavior
- Think before acting. Ship real code.
- One file operation per heartbeat.
- Write REAL content. No placeholders.
- The user is the Admiral. You are the Captain.
- When you need human auth, ALERT and WAIT.
`);
  writeFile('.agent/next', readFile('.agent/next') || '# Task queue — one per line, top = priority\n');
  writeFile('.agent/done', readFile('.agent/done') || '# Completed tasks\n');
  writeFile('.agent/log', readFile('.agent/log') || `# Captain's Log\n# ${agentName} — ${new Date().toISOString()}\n\n`);
  console.log(green('  ✓ Identity configured'));

  // Step 2: GitHub Token
  section(`${++current}/${total} GitHub Token`);
  console.log(dim('  Agent needs write access to push code.'));
  console.log(dim('  Create: https://github.com/settings/tokens (repo scope)'));
  const token = await ask('GitHub PAT', { password: true, default: readFile('.env.local')?.match(/GITHUB_TOKEN=(.+)/)?.[1] || '' });
  if (token) {
    const env = readFile('.env.local') || '';
    writeFile('.env.local', `GITHUB_TOKEN=${token}` + (env ? '\n' + env : ''));
  }
  console.log(green('  ✓ Token configured'));

  // Step 3: LLM Providers
  section(`${++current}/${total} LLM Providers (BYOK v2)`);
  console.log(dim('  Zero keys in code. All keys → GitHub Secrets or .env.local'));
  console.log('');
  console.log('  1. DeepSeek — deepseek-chat, deepseek-reasoner');
  console.log('  2. SiliconFlow — Seed-OSS-36B, Qwen3-Coder-480B');
  console.log('  3. DeepInfra — Qwen3.5-397B, Seed-2.0-pro');
  console.log('  4. Moonshot — kimi-k2.5 (strategist)');
  console.log('  5. Ollama — local models (air-gapped)');
  console.log('  6. OpenAI / Anthropic / Google');
  console.log('  7. Skip — configure later');
  console.log('');

  const providerChoice = await ask('Add provider (1-7)', { default: '7' });
  const providerMap = {
    '1': { env: 'DEEPSEEK_API_KEY', url: 'https://platform.deepseek.com/api_keys', name: 'DeepSeek' },
    '2': { env: 'SILICONFLOW_API_KEY', url: 'https://cloud.siliconflow.cn/account/ak', name: 'SiliconFlow' },
    '3': { env: 'DEEPINFRA_API_KEY', url: 'https://deepinfra.com/dashboard/keys', name: 'DeepInfra' },
    '4': { env: 'MOONSHOT_API_KEY', url: 'https://platform.moonshot.cn/console/api-keys', name: 'Moonshot' },
    '5': { env: 'OLLAMA_BASE_URL', url: 'http://localhost:11434', name: 'Ollama' },
    '6': { env: 'OPENAI_API_KEY', url: 'https://platform.openai.com/api-keys', name: 'OpenAI' },
  };

  if (providerMap[providerChoice]) {
    const p = providerMap[providerChoice];
    if (p.name === 'Ollama') {
      const url = await ask('Ollama URL', { default: 'http://localhost:11434' });
      const env = readFile('.env.local') || '';
      writeFile('.env.local', env + `\n${p.env}=${url}`);
    } else {
      console.log(dim(`  Get key: ${p.url}`));
      const key = await ask(`${p.name} API key`, { password: true });
      if (key) {
        const env = readFile('.env.local') || '';
        writeFile('.env.local', env + `\n${p.env}=${key}`);
        console.log(dim(`  Later: gh secret set ${p.env}`));
      }
    }
  }
  console.log(green('  ✓ Providers configured'));

  // Step 4: Deploy
  section(`${++current}/${total} Deploy`);
  const deploy = await ask('Deploy now?', { choices: ['yes', 'no', 'later'], default: 'yes' });

  if (deploy === 'yes') {
    if (!hasCommand('wrangler')) {
      console.log(dim('  Installing wrangler...'));
      try { execSync('npm install -g wrangler', { stdio: 'pipe', timeout: 60000 }); } catch { console.log(red('  Failed. Run: npm install -g wrangler')); }
    }
    if (hasCommand('wrangler')) {
      try {
        execSync('npx wrangler whoami', { stdio: 'pipe', timeout: 15000 });
        console.log(dim('  Logged in ✓'));
      } catch {
        console.log(dim('  Opening browser for Cloudflare login...'));
        try { execSync('npx wrangler login', { stdio: 'inherit', timeout: 120000 }); } catch { console.log(red('  Login failed.')); }
      }
      try {
        console.log(dim('  Deploying...'));
        execSync('npx wrangler deploy', { stdio: 'pipe', cwd: REPO_ROOT, timeout: 60000 });
        console.log(green('  ✓ Deployed'));
      } catch { console.log(red('  Deploy failed. Run: npx wrangler deploy')); }
    }
  } else if (deploy === 'later') {
    console.log(dim('  Run: npx wrangler deploy'));
  } else {
    console.log(dim('  Local mode — agent runs without Cloudflare'));
  }
  console.log(green('  ✓ Deploy step complete'));

  // Step 5: Secrets
  section(`${++current}/${total} GitHub Secrets`);
  if (hasCommand('gh')) {
    const env = readFile('.env.local') || '';
    let secretsSet = 0;
    env.split('\n').filter(l => l.includes('=') && !l.startsWith('GITHUB')).forEach(line => {
      const [key, ...vals] = line.split('=');
      const val = vals.join('=');
      if (key && val) {
        try {
          execSync(`echo "${val}" | gh secret set ${key}`, { stdio: 'pipe', timeout: 15000 });
          console.log(dim(`  ✓ ${key}`));
          secretsSet++;
        } catch { console.log(dim(`  ⚠ ${key} — run: gh secret set ${key}`)); }
      }
    });
    if (secretsSet === 0) console.log(dim('  No secrets to set'));
  } else {
    console.log(dim('  Install gh CLI: https://cli.github.com/'));
  }
  console.log(green('  ✓ Secrets step complete'));

  // Step 6: Verify
  section(`${++current}/${total} Verify`);
  const workerName = readFile('wrangler.toml')?.match(/name = "(.+)"/)?.[1];
  if (workerName) {
    try {
      const resp = await fetch(`https://${workerName}.casey-digennaro.workers.dev/health`);
      if (resp.ok) console.log(green(`  ✓ ${workerName} is alive`));
      else console.log(yellow(`  ⚠ ${resp.status}`));
    } catch { console.log(dim('  Could not reach worker (may not be deployed)')); }
  } else {
    console.log(dim('  No wrangler.toml — running locally'));
  }
  console.log(green('  ✓ Verification complete'));

  // Done
  appendFile('.agent/log', `[${new Date().toISOString()}] Onboarding complete. Agent: ${agentName}. Domain: ${domain}.`);

  console.log('');
  console.log(teal(bold('  ═══════════════════════════════════════════')));
  console.log(teal(bold(`  ${agentName} is configured. The bridge is open.`)));
  console.log('');
  console.log(dim('  Commands:'));
  console.log(gray('    npm start       — TUI (this interface)'));
  console.log(gray('    git-agent onboard — Re-run onboarding'));
  console.log(gray('    git-agent status  — Quick status'));
  console.log(gray('    git-agent watch   — Read-only monitoring'));
  console.log(gray('    git-agent shell   — Drop into bash'));
  console.log(gray('    git-agent heartbeat — Trigger heartbeat'));
  console.log('');
  console.log(teal('  git push origin self'));
  console.log('');
}

// ── TUI: Interactive Mode ────────────────────────────────────
async function tui() {
  console.clear();
  console.log(LOGO);
  console.log(teal(bold('  Git-Agent')) + dim(' v2.1 — The Bridge'));

  const identity = readFile('.agent/identity');
  const name = identity?.match(/Name: (.+)/)?.[1] || 'Agent';
  const domain = identity?.match(/Domain: (.+)/)?.[1] || 'unknown';
  console.log(dim(`  ${name} — ${domain}`));
  console.log(dim(`  ${new Date().toLocaleString()}`));

  const queue = readFile('.agent/next') || '';
  const done = readFile('.agent/done') || '';
  const queueCount = queue.split('\n').filter(l => l.trim() && !l.startsWith('#')).length;
  const doneCount = done.split('\n').filter(l => l.trim() && !l.startsWith('#')).length;
  const branch = (() => { try { return execSync('git branch --show-current', { stdio: 'pipe' }).toString().trim(); } catch { return 'unknown'; } })();
  const lastCommit = (() => { try { return execSync('git log -1 --oneline', { stdio: 'pipe' }).toString().trim(); } catch { return 'none'; } })();

  console.log('');
  console.log(gray(`  Branch: ${branch}  Queue: ${queueCount}  Done: ${doneCount}`));
  console.log(gray(`  Last: ${lastCommit.slice(0, 60)}`));
  console.log('');

  if (queueCount > 0) {
    console.log(teal('  Queue:'));
    queue.split('\n').filter(l => l.trim() && !l.startsWith('#')).slice(0, 5).forEach((l, i) => {
      console.log(gray(`    ${i === 0 ? '►' : ' '} ${l.trim().slice(0, 55)}`));
    });
    if (queueCount > 5) console.log(dim(`    ... +${queueCount - 5} more`));
  }

  if (doneCount > 0) {
    console.log('');
    console.log(dim('  Recent:'));
    done.split('\n').filter(l => l.trim() && !l.startsWith('#')).slice(-3).forEach(l => {
      console.log(dim(`    ✓ ${l.trim().slice(0, 55)}`));
    });
  }

  console.log('');
  console.log(teal('  ┌─────────────────────────────────────┐'));
  console.log(teal('  │') + gray('  onboard    Re-run wizard            ') + teal('│'));
  console.log(teal('  │') + gray('  add        Add task to queue         ') + teal('│'));
  console.log(teal('  │') + gray('  log        Captain\'s log             ') + teal('│'));
  console.log(teal('  │') + gray('  heartbeat  Trigger heartbeat         ') + teal('│'));
  console.log(teal('  │') + gray('  watch      Read-only monitoring      ') + teal('│'));
  console.log(teal('  │') + gray('  shell      Drop into bash            ') + teal('│'));
  console.log(teal('  │') + gray('  status     Git + agent status        ') + teal('│'));
  console.log(teal('  │') + gray('  deploy     Deploy to Cloudflare      ') + teal('│'));
  console.log(teal('  │') + gray('  auth       Request Admiral auth      ') + teal('│'));
  console.log(teal('  │') + gray('  gc         Garbage collection        ') + teal('│'));
  console.log(teal('  │') + gray('  quit       Exit                      ') + teal('│'));
  console.log(teal('  └─────────────────────────────────────┘'));
  console.log('');

  const cmd = await ask('Command');

  switch (cmd) {
    case 'onboard': return onboard();
    case 'add': {
      const task = await ask('Task');
      if (task) {
        appendFile('.agent/next', task);
        console.log(green('  ✓ Added'));
      }
      await new Promise(r => setTimeout(r, 500));
      return tui();
    }
    case 'log': {
      const log = readFile('.agent/log') || readFile('docs/captain-log.md') || '(empty)';
      const lines = log.split('\n');
      lines.slice(-20).forEach(l => console.log(dim(`  ${l}`)));
      await ask('\nEnter to continue...');
      return tui();
    }
    case 'heartbeat': {
      const workerName = readFile('wrangler.toml')?.match(/name = "(.+)"/)?.[1];
      if (!workerName) { console.log(red('  No wrangler.toml')); await new Promise(r => setTimeout(r, 500)); return tui(); }
      console.log(dim('  Triggering...'));
      try {
        const resp = await fetch(`https://${workerName}.casey-digennaro.workers.dev/api/heartbeat`, { method: 'POST' });
        const data = await resp.json();
        console.log(green(`  ✓ ${data.action || 'done'}`));
      } catch { console.log(red('  Could not reach worker')); }
      await ask('\nEnter to continue...');
      return tui();
    }
    case 'watch': return watchMode();
    case 'shell': return shellMode();
    case 'status': return statusMode();
    case 'deploy': {
      console.log(dim('  Deploying...'));
      try {
        execSync('npx wrangler deploy', { stdio: 'inherit', cwd: REPO_ROOT, timeout: 60000 });
      } catch { console.log(red('  Deploy failed')); }
      await ask('\nEnter to continue...');
      return tui();
    }
    case 'auth': {
      const action = await ask('What needs auth?');
      const url = await ask('URL to open');
      await admiralIntervention({ action, url, reason: 'Agent cannot authenticate independently' });
      console.log(green('  ✓ Continuing with human-authenticated session'));
      await new Promise(r => setTimeout(r, 500));
      return tui();
    }
    case 'gc': {
      console.log(dim('  Running garbage collection...'));
      const done = readFile('.agent/done') || '';
      const doneLines = done.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      if (doneLines.length > 50) {
        const archived = doneLines.slice(0, doneLines.length - 30);
        const kept = doneLines.slice(doneLines.length - 30);
        writeFile('.agent/done', '# Completed tasks (recent)\n' + kept.join('\n'));
        appendFile('docs/archive/done-archive.md', `# Archive ${new Date().toISOString()}\n` + archived.join('\n') + '\n');
        console.log(green(`  ✓ Archived ${archived.length} tasks, kept ${kept.length}`));
      } else {
        console.log(dim('  Nothing to collect (under 50 items)'));
      }
      await ask('\nEnter to continue...');
      return tui();
    }
    case 'quit':
    default:
      console.log(teal('\n  Fair winds, Admiral.\n'));
      process.exit(0);
  }
}

// ── Watch Mode: Read-only monitoring ─────────────────────────
async function watchMode() {
  console.clear();
  console.log(teal(bold('  📡 Watch Mode — read-only')));
  console.log(dim('  Press Ctrl+C or type "back" to return to TUI'));
  console.log('');

  const interval = setInterval(async () => {
    const lastCommit = (() => { try { return execSync('git log -1 --oneline --format="%h %s (%cr)"', { stdio: 'pipe' }).toString().trim(); } catch { return '—'; } })();
    const queueCount = (readFile('.agent/next') || '').split('\n').filter(l => l.trim() && !l.startsWith('#')).length;
    const doneCount = (readFile('.agent/done') || '').split('\n').filter(l => l.trim() && !l.startsWith('#')).length;
    const status = (() => { try { return execSync('git status --porcelain', { stdio: 'pipe' }).toString().trim().split('\n').length - 1; } catch { return 0; } })();
    const time = new Date().toLocaleTimeString();

    process.stdout.write(`\r  ${dim(time)}  ${teal('queue:')}${queueCount}  ${green('done:')}${doneCount}  ${gray('changed:')}${status}  ${gray(lastCommit.slice(0, 50))}      `);
  }, 2000);

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.question('', (answer) => {
    clearInterval(interval);
    rl.close();
    if (answer.trim() === 'back') tui();
    else watchMode();
  });
}

// ── Shell Mode: Drop into bash ──────────────────────────────
async function shellMode() {
  console.log('');
  console.log(teal(bold('  🔧 Shell Mode')));
  console.log(dim('  Type "back" to return to TUI'));
  console.log(dim('  The agent is paused. You have full shell access.'));
  console.log('');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const prompt = () => {
    rl.question(`${teal('shell')} ${gray('$')} `, async (cmd) => {
      if (cmd.trim() === 'back') { rl.close(); return tui(); }
      if (!cmd.trim()) return prompt();
      try {
        const output = execSync(cmd, { stdio: 'pipe', timeout: 30000, cwd: REPO_ROOT }).toString();
        if (output) console.log(output.slice(0, 2000));
      } catch (e) {
        console.log(red(e.stderr?.toString().slice(0, 500) || 'Error'));
      }
      prompt();
    });
  };
  prompt();
}

// ── Status Mode: Quick overview ──────────────────────────────
async function statusMode() {
  console.clear();
  console.log(teal(bold('  Status')));
  console.log('');

  const identity = readFile('.agent/identity');
  const name = identity?.match(/Name: (.+)/)?.[1] || 'unconfigured';

  // Git status
  const branch = (() => { try { return execSync('git branch --show-current', { stdio: 'pipe' }).toString().trim(); } catch { return '—'; } })();
  const commits = (() => { try { return execSync('git log --oneline | wc -l', { stdio: 'pipe' }).toString().trim(); } catch { return '—'; } })();
  const lastCommit = (() => { try { return execSync('git log -1 --format="%h %s (%cr)"', { stdio: 'pipe' }).toString().trim(); } catch { return '—'; } })();
  const changed = (() => { try { return execSync('git status --porcelain | wc -l', { stdio: 'pipe' }).toString().trim(); } catch { return '0'; } })();
  const ahead = (() => { try { return execSync('git rev-list --count @{u}..HEAD', { stdio: 'pipe' }).toString().trim(); } catch { return '?'; } })();

  console.log(gray(`  Agent:    ${name}`));
  console.log(gray(`  Branch:   ${branch}`));
  console.log(gray(`  Commits:  ${commits}`));
  console.log(gray(`  Ahead:    ${ahead} (unpushed)`));
  console.log(gray(`  Changed:  ${changed} files`));
  console.log(gray(`  Last:     ${lastCommit}`));

  const queueCount = (readFile('.agent/next') || '').split('\n').filter(l => l.trim() && !l.startsWith('#')).length;
  const doneCount = (readFile('.agent/done') || '').split('\n').filter(l => l.trim() && !l.startsWith('#')).length;
  console.log(gray(`  Queue:    ${queueCount} tasks`));
  console.log(gray(`  Done:     ${doneCount} completed`));

  const workerName = readFile('wrangler.toml')?.match(/name = "(.+)"/)?.[1];
  if (workerName) {
    try {
      const resp = await fetch(`https://${workerName}.casey-digennaro.workers.dev/health`, { signal: AbortSignal.timeout(5000) });
      console.log(gray(`  Worker:   ${resp.ok ? green('alive') : red(`${resp.status}`)}`));
    } catch {
      console.log(gray(`  Worker:   ${dim('unreachable')}`));
    }
  }

  // File counts
  const files = (() => { try { return execSync('find . -name "*.ts" -o -name "*.js" -o -name "*.mjs" | grep -v node_modules | wc -l', { stdio: 'pipe' }).toString().trim(); } catch { return '—'; } })();
  const docs = (() => { try { return execSync('find docs/ -type f 2>/dev/null | wc -l', { stdio: 'pipe' }).toString().trim(); } catch { return '0'; } })();
  console.log(gray(`  Files:    ${files} code, ${docs} docs`));

  await ask('\nEnter to return...');
  return tui();
}

// ── CLI Mode ─────────────────────────────────────────────────
async function cli(args) {
  const cmd = args[0];
  switch (cmd) {
    case 'onboard': return onboard();
    case 'status': return statusMode();
    case 'watch': return watchMode();
    case 'shell': return shellMode();
    case 'heartbeat': {
      const workerName = readFile('wrangler.toml')?.match(/name = "(.+)"/)?.[1];
      if (!workerName) { console.log(red('No wrangler.toml')); return; }
      const resp = await fetch(`https://${workerName}.casey-digennaro.workers.dev/api/heartbeat`, { method: 'POST' });
      const data = await resp.json();
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    case 'add': {
      const task = args.slice(1).join(' ');
      if (!task) { console.log(red('Usage: git-agent add "task description"')); return; }
      appendFile('.agent/next', task);
      console.log(green('✓ Task added'));
      return;
    }
    case 'log': {
      const log = readFile('.agent/log') || '(empty)';
      console.log(log.slice(-2000));
      return;
    }
    case 'gc': {
      // Inline GC for CLI
      const done = readFile('.agent/done') || '';
      const lines = done.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      if (lines.length > 50) {
        writeFile('.agent/done', '# Recent\n' + lines.slice(-30).join('\n'));
        appendFile('docs/archive/done-archive.md', `# ${new Date().toISOString()}\n` + lines.slice(0, -30).join('\n') + '\n');
        console.log(green(`✓ Archived ${lines.length - 30} tasks`));
      } else { console.log('Nothing to collect'); }
      return;
    }
    default:
      console.log(teal(bold('  Git-Agent v2.1 — The Bridge')));
      console.log('');
      console.log(gray('  Commands:'));
      console.log('    onboard      Run onboarding wizard');
      console.log('    status       Show agent status');
      console.log('    watch        Read-only monitoring');
      console.log('    shell        Drop into bash');
      console.log('    heartbeat    Trigger heartbeat');
      console.log('    add "task"   Add task to queue');
      console.log('    log          Show captain\'s log');
      console.log('    gc           Garbage collection');
      console.log('    (no args)    Launch TUI');
  }
}

// ── Main ────────────────────────────────────────────────────
const args = process.argv.slice(2);
const mode = args[0];

if (mode && ['status', 'watch', 'shell', 'heartbeat', 'add', 'log', 'gc'].includes(mode)) {
  cli(args);
} else if (mode === 'onboard') {
  onboard().catch(e => { console.error(red(e.message)); process.exit(1); });
} else if (mode === '--help' || mode === '-h') {
  cli(['help']);
} else {
  // Default: TUI if identity exists, onboard otherwise
  if (fileExists('.agent/identity')) {
    tui().catch(e => { console.error(red(e.message)); process.exit(1); });
  } else {
    onboard().catch(e => { console.error(red(e.message)); process.exit(1); });
  }
}
