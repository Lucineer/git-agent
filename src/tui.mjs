#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
// Git-Agent TUI — Terminal onboarding & agent interface
// Fork → Codespaces → this runs → agent is alive
//
// Superinstance & Lucineer (DiGennaro et al.) — 2026-04-04
// ═══════════════════════════════════════════════════════════════════

import { createInterface } from 'readline';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = process.cwd();

// ── Colors (ANSI, no deps) ──────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  teal: '\x1b[38;2;0;230;214m',
  green: '\x1b[38;2;31;203;88m',
  gray: '\x1b[38;2;138;147;180m',
  white: '\x1b[38;2;216;216;236m',
  red: '\x1b[38;2;255;100;100m',
  yellow: '\x1b[38;2;245;158;11m',
  bg: '\x1b[48;2;10;10;15m',
};

const b = (t, c = C.white) => `${c}${t}${C.reset}`;
const dim = t => b(t, C.dim);
const teal = t => b(t, C.teal);
const green = t => b(t, C.green);
const gray = t => b(t, C.gray);
const red = t => b(t, C.red);
const bold = t => b(t, C.bold);

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

const BANNER = `
${LOGO}
${teal(bold('  Git-Agent'))} ${dim('v2.0')}
${gray('  The repo IS the agent')}
`;

// ── Helpers ─────────────────────────────────────────────────
function ask(question, opts = {}) {
  const { default: def, password = false, choices } = opts;
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    let prompt = `\n${teal('  ›')} ${gray(question)}`;
    if (def) prompt += dim(` (${def})`);
    prompt += ' ';
    rl.question(prompt, answer => {
      rl.close();
      const val = answer.trim() || def || '';
      if (choices && val && !choices.includes(val)) {
        console.log(red(`  Invalid choice. Use: ${choices.join(', ')}`));
        return resolve(ask(question, opts));
      }
      resolve(val);
    });
  });
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function step(n, total, text) {
  const pct = Math.round((n / total) * 100);
  const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
  process.stdout.write(`\r  ${teal('━')} [${teal(bar)}${dim(bar)}] ${gray(`${pct}%`)} ${dim(text)}`);
}

function stepDone(n, total, text) {
  step(n, total, text);
  process.stdout.write(` ${green('✓')}\n`);
}

function spin(text) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const id = setInterval(() => {
    process.stdout.write(`\r  ${teal(frames[i])} ${dim(text)}`);
    i = (i + 1) % frames.length;
  }, 80);
  return () => { clearInterval(id); process.stdout.write(`\r  ${green('✓')} ${text}\n`); };
}

function section(title) {
  console.log(`\n${teal(bold('  ─── ' + title + ' ───'))}`);
}

function fileExists(path) { return existsSync(join(REPO_ROOT, path)); }

function writeFile(path, content) {
  const full = join(REPO_ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

function readFile(path) {
  try { return readFileSync(join(REPO_ROOT, path), 'utf-8'); } catch { return null; }
}

function hasCommand(cmd) {
  try { execSync(`which ${cmd}`, { stdio: 'pipe' }); return true; } catch { return false; }
}

// ── Onboarding Flow ─────────────────────────────────────────
async function onboard() {
  console.clear();
  console.log(BANNER);
  console.log(dim('  Welcome, Admiral. Your vessel needs configuration.\n'));
  console.log(gray('  This wizard will:'));
  console.log(gray('  1. Set your agent name and personality'));
  console.log(gray('  2. Configure LLM providers (GitHub Secrets)'));
  console.log(gray('  3. Set up the heartbeat'));
  console.log(gray('  4. Deploy to Cloudflare Workers'));
  console.log(gray('  5. Verify the agent is alive'));
  console.log('');
  await ask('Press Enter to begin...');

  const total = 6;
  let current = 0;

  // ── Step 1: Agent Identity ────────────────────────────
  section('Step 1: Agent Identity');
  current++;

  const agentName = await ask('What should we call your agent?', { default: 'Flux' });
  const domain = await ask('What domain does this agent operate in?', { default: 'general-purpose' });
  const personality = await ask('Personality style', { choices: ['precise', 'warm', 'creative', 'technical', 'casual'], default: 'precise' });
  const vibe = await ask('One sentence about how the agent should feel', { default: `A ${personality} ${domain} agent named ${agentName} that improves through git.` });

  writeFile('.agent/identity', `# ${agentName}
## Identity
- Name: ${agentName}
- Domain: ${domain}
- Personality: ${personality}
- Vibe: ${vibe}

## Mission
You are ${agentName}, a git-native repo-agent. The repo IS the agent.
You improve yourself through pull requests. You coordinate with the fleet through git.

## Behavior
- Think before acting. Ship real code.
- One file operation per heartbeat.
- Write REAL content. No placeholders.
- The user is the Admiral. You are the Captain.
`);
  writeFile('.agent/next', '# Task queue — one per line, top = priority\n');
  writeFile('.agent/done', '# Completed tasks\n');
  stepDone(1, total, 'Agent identity configured');

  // ── Step 2: GitHub Token ──────────────────────────────
  section('Step 2: GitHub Token');
  current++;

  const ghToken = readFile('.env.local')?.match(/GITHUB_TOKEN=(.+)/)?.[1] || '';
  console.log(dim('  Needed for the agent to push code to your repo.'));
  console.log(dim('  Create one: https://github.com/settings/tokens (repo scope)'));
  const token = await ask('GitHub personal access token', { password: true, default: ghToken || process.env.GITHUB_TOKEN || '' });

  if (token) {
    writeFile('.env.local', `GITHUB_TOKEN=${token}`);
    console.log(dim('  To store in GitHub Secrets:'));
    console.log(gray(`    echo "${token}" | gh secret set GITHUB_TOKEN`));
  }
  stepDone(2, total, 'GitHub token configured');

  // ── Step 3: LLM Providers ─────────────────────────────
  section('Step 3: LLM Providers (BYOK v2)');
  current++;

  console.log(dim('  Zero keys in code. All keys go to Cloudflare Secrets Store.'));
  console.log(dim('  Pick at least one provider for your agent to think.\n'));

  const providers = [
    { name: 'DeepSeek', env: 'DEEPSEEK_API_KEY', url: 'https://platform.deepseek.com/api_keys', models: 'deepseek-chat, deepseek-reasoner', color: green },
    { name: 'SiliconFlow', env: 'SILICONFLOW_API_KEY', url: 'https://cloud.siliconflow.cn/account/ak', models: 'Seed-OSS-36B, Qwen3-Coder-480B', color: teal },
    { name: 'DeepInfra', env: 'DEEPINFRA_API_KEY', url: 'https://deepinfra.com/dashboard/keys', models: 'Qwen3.5-397B, Seed-2.0-pro, Llama-4-Scout', color: b('DeepInfra', C.yellow) },
    { name: 'Moonshot (Kimi K2.5)', env: 'MOONSHOT_API_KEY', url: 'https://platform.moonshot.cn/console/api-keys', models: 'kimi-k2.5 (strategist)', color: teal },
    { name: 'z.ai (GLM)', env: 'ZAI_API_KEY', url: 'https://open.bigmodel.cn/', models: 'GLM-5, GLM-5.1', color: gray },
    { name: 'OpenAI', env: 'OPENAI_API_KEY', url: 'https://platform.openai.com/api-keys', models: 'GPT-4o, o1', color: gray },
    { name: 'Anthropic', env: 'ANTHROPIC_API_KEY', url: 'https://console.anthropic.com/', models: 'Claude 4, Claude Opus', color: gray },
    { name: 'Google Gemini', env: 'GOOGLE_API_KEY', url: 'https://aistudio.google.com/apikey', models: 'Gemini 2.5 Pro', color: gray },
  ];

  const configured = [];
  const addMore = await ask('Add an LLM provider?', { choices: ['yes', 'no', 'later'], default: 'later' });

  if (addMore === 'yes') {
    console.log('');
    providers.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} — ${dim(p.models)}`);
    });
    console.log('');
    const choice = await ask('Provider number', {});
    const idx = parseInt(choice) - 1;
    if (idx >= 0 && idx < providers.length) {
      const p = providers[idx];
      console.log(dim(`  Get your key: ${p.url}`));
      const key = await ask(`${p.name} API key`, { password: true });
      if (key) {
        writeFile('.env.local', readFile('.env.local') + `\n${p.env}=${key}`);
        configured.push(p.name);
        console.log(dim(`  wrangler secret put ${p.env}  (after deploy)`));
      }
    }
  }
  stepDone(3, total, configured.length > 0 ? `${configured.length} provider(s) configured` : 'Providers: configure after deploy');

  // ── Step 4: Heartbeat ─────────────────────────────────
  section('Step 4: Heartbeat & Deploy');
  current++;

  const deploy = await ask('Deploy to Cloudflare Workers now?', { choices: ['yes', 'no', 'later'], default: 'yes' });

  if (deploy === 'yes') {
    if (!hasCommand('wrangler')) {
      console.log(dim('  Installing wrangler...'));
      const stop = spin('Installing wrangler');
      try {
        execSync('npm install -g wrangler', { stdio: 'pipe', timeout: 60000 });
        stop();
      } catch (e) {
        stop();
        console.log(red('  Could not install wrangler. Run: npm install -g wrangler'));
      }
    }

    if (hasCommand('wrangler')) {
      const stop = spin('Logging in to Cloudflare');
      try {
        execSync('npx wrangler whoami', { stdio: 'pipe', timeout: 15000 });
        stop();
        console.log(dim('  Already logged in ✓'));
      } catch {
        stop();
        console.log(dim('  Opening browser for Cloudflare login...'));
        try {
          execSync('npx wrangler login', { stdio: 'inherit', timeout: 120000 });
        } catch (e) {
          console.log(red('  Login failed. Run: npx wrangler login'));
        }
      }

      const stop2 = spin('Deploying worker');
      try {
        execSync('npx wrangler deploy', { stdio: 'pipe', cwd: REPO_ROOT, timeout: 60000 });
        stop2();
      } catch (e) {
        stop2();
        console.log(red('  Deploy failed. Check wrangler.toml and try: npx wrangler deploy'));
      }
    }
  }
  stepDone(4, total, deploy === 'yes' ? 'Deployed to Cloudflare Workers' : 'Deploy: run npx wrangler deploy');

  // ── Step 5: Set Secrets ───────────────────────────────
  section('Step 5: GitHub Secrets (for Actions)');
  current++;

  if (hasCommand('gh') && token) {
    console.log(dim('  Setting GitHub Secrets for CI/Actions...'));
    const envContent = readFile('.env.local') || '';
    envContent.split('\n').filter(l => l.includes('=')).forEach(line => {
      const [key, ...vals] = line.split('=');
      const val = vals.join('=');
      if (key && val && key.startsWith('GITHUB') === false) {
        try {
          execSync(`echo "${val}" | gh secret set ${key}`, { stdio: 'pipe', timeout: 15000 });
          console.log(dim(`  ✓ ${key}`));
        } catch {
          console.log(dim(`  ⚠ ${key} (set manually: gh secret set ${key})`));
        }
      }
    });
  }
  stepDone(5, total, 'GitHub Secrets configured');

  // ── Step 6: Verify ────────────────────────────────────
  section('Step 6: Verify');
  current++;

  const workerName = readFile('wrangler.toml')?.match(/name = "(.+)"/)?.[1] || 'git-agent';
  console.log(dim(`  Checking ${workerName}...`));
  try {
    const resp = await fetch(`https://${workerName}.casey-digennaro.workers.dev/health`);
    if (resp.ok) {
      const data = await resp.json();
      console.log(green(`  ✓ Agent is alive!`));
      console.log(dim(`    Status: ${data.status}`));
      console.log(dim(`    Repo: ${data.repo}`));
    } else {
      console.log(yellow(`  ⚠ Worker responded with ${resp.status}`));
    }
  } catch {
    console.log(dim('  Could not reach worker (may not be deployed yet)'));
  }
  stepDone(6, total, 'Verification complete');

  // ── Done ──────────────────────────────────────────────
  console.log('');
  console.log(teal(bold('  ═══════════════════════════════════════════')));
  console.log('');
  console.log(teal(bold('  Your agent is configured.')));
  console.log('');
  console.log(gray(`  Agent: ${agentName}`));
  console.log(gray(`  Domain: ${domain}`));
  console.log(gray(`  Personality: ${personality}`));
  console.log(gray(`  Configured providers: ${configured.length > 0 ? configured.join(', ') : 'none yet'}`));
  console.log('');
  console.log(dim('  Next steps:'));
  console.log(gray('  1. Add tasks to .agent/next (one per line)'));
  console.log(gray('  2. Run: npx wrangler secret put DEEPSEEK_API_KEY'));
  console.log(gray('  3. Deploy: npx wrangler deploy'));
  console.log(gray('  4. Check: curl https://your-worker.workers.dev/health'));
  console.log(gray('  5. Chat: POST https://your-worker.workers.dev/api/chat'));
  console.log('');
  console.log(dim('  The agent runs heartbeats every 15 minutes via cron.'));
  console.log(dim('  It reads .agent/identity, processes .agent/next, logs to .agent/done.'));
  console.log(dim('  Every commit is a decision. The repo IS the agent.'));
  console.log('');
  console.log(teal('  git push origin self'));
  console.log('');
}

// ── Agent TUI (live interface) ──────────────────────────────
async function agentTui() {
  console.clear();
  console.log(BANNER);

  const identity = readFile('.agent/identity');
  if (identity) {
    const name = identity.match(/Name: (.+)/)?.[1] || 'Agent';
    const domain = identity.match(/Domain: (.+)/)?.[1] || 'unknown';
    console.log(dim(`  ${name} — ${domain}`));
  }

  const queue = readFile('.agent/next') || '';
  const done = readFile('.agent/done') || '';
  const queueCount = queue.split('\n').filter(l => l.trim() && !l.startsWith('#')).length;
  const doneCount = done.split('\n').filter(l => l.trim() && !l.startsWith('#')).length;

  console.log('');
  console.log(gray(`  Queue: ${queueCount} tasks | Done: ${doneCount} completed`));
  console.log('');

  if (queueCount > 0) {
    console.log(teal('  Queue:'));
    queue.split('\n').filter(l => l.trim() && !l.startsWith('#')).slice(0, 5).forEach((l, i) => {
      console.log(gray(`    ${i === 0 ? '►' : ' '} ${l.trim()}`));
    });
    if (queueCount > 5) console.log(dim(`    ... ${queueCount - 5} more`));
  }

  if (doneCount > 0) {
    console.log('');
    console.log(dim('  Recent:'));
    done.split('\n').filter(l => l.trim() && !l.startsWith('#')).slice(-3).forEach(l => {
      console.log(dim(`    ✓ ${l.trim().slice(0, 60)}`));
    });
  }

  console.log('');
  console.log(teal('  Commands:'));
  console.log(gray('    onboard   — Re-run onboarding wizard'));
  console.log(gray('    status    — Show agent state'));
  console.log(gray('    add       — Add task to queue'));
  console.log(gray('    log       — View captain log'));
  console.log(gray('    heartbeat — Trigger manual heartbeat'));
  console.log(gray('    quit      — Exit'));
  console.log('');

  const cmd = await ask('Command', { default: 'quit' });

  switch (cmd) {
    case 'onboard': return onboard();
    case 'status': return agentTui();
    case 'add': {
      const task = await ask('Task description');
      if (task) {
        const current = readFile('.agent/next') || '';
        writeFile('.agent/next', current + task + '\n');
        console.log(green('  ✓ Task added'));
      }
      await wait(500);
      return agentTui();
    }
    case 'log': {
      const log = readFile('docs/captain-log.md') || readFile('.agent/log.md') || '(no log entries)';
      console.log(dim('\n  ' + log.slice(0, 500) + (log.length > 500 ? '\n  ...' : '')));
      await ask('\nPress Enter to continue...');
      return agentTui();
    }
    case 'heartbeat': {
      const workerName = readFile('wrangler.toml')?.match(/name = "(.+)"/)?.[1];
      if (!workerName) { console.log(red('  No wrangler.toml found')); return agentTui(); }
      console.log(dim('  Triggering heartbeat...'));
      try {
        const resp = await fetch(`https://${workerName}.casey-digennaro.workers.dev/api/heartbeat`, { method: 'POST' });
        const data = await resp.json();
        console.log(green(`  ✓ ${data.action}`));
        if (data.ref) console.log(dim(`    ref: ${data.ref}`));
        if (data.duration) console.log(dim(`    took: ${data.duration}ms`));
      } catch { console.log(red('  Could not reach worker')); }
      await ask('\nPress Enter to continue...');
      return agentTui();
    }
    case 'quit':
    default:
      console.log(teal('\n  Fair winds, Admiral.\n'));
      process.exit(0);
  }
}

// ── Main ────────────────────────────────────────────────────
const args = process.argv.slice(2);
const cmd = args[0];

if (cmd === '--onboard' || !fileExists('.agent/identity')) {
  onboard().catch(e => { console.error(red(e.message)); process.exit(1); });
} else if (cmd === '--agent') {
  agentTui().catch(e => { console.error(red(e.message)); process.exit(1); });
} else {
  // Default: if identity exists, show agent TUI. Otherwise onboard.
  if (fileExists('.agent/identity')) {
    agentTui().catch(e => { console.error(red(e.message)); process.exit(1); });
  } else {
    onboard().catch(e => { console.error(red(e.message)); process.exit(1); });
  }
}
