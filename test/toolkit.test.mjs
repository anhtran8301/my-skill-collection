import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { parse as parseTOML } from 'smol-toml';
import YAML from 'yaml';
import { ROOT, apply, checkRepository, checkTarget, filesIn } from '../scripts/toolkit.mjs';

const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog/manifest.json'), 'utf8'));
const options = { workflow: 'aihero', tracker: 'local', agent: 'both' };
function temp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai toolkit test '));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return fs.realpathSync(dir);
}
const read = (target, file) => fs.readFileSync(path.join(target, file), 'utf8');
const state = (target) => JSON.parse(read(target, '.ai-toolkit/state.json'));
const cli = (...args) => spawnSync(process.execPath, [path.join(ROOT, 'scripts/toolkit.mjs'), ...args], { encoding: 'utf8' });

test('repository provenance, metadata, references and checksums', () => {
  assert.equal(checkRepository().skills, data.skills.length);
  assert.equal(data.skills.length, 59);
  assert.ok(data.skills.every((skill) => skill.license && skill.sha256 && skill.revision));
  const sources = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog/sources.json'), 'utf8'));
  for (const name of ['aihero.dev', 'skills.sh', 'anthropics/skills', 'openai/plugins', 'vercel-labs/agent-skills', 'trailofbits/skills', 'obra/superpowers', 'addyosmani/agent-skills']) assert.ok(sources.some((source) => source.url.includes(name)));
});

for (const workflow of ['aihero', 'superpowers']) {
  for (const agent of ['claude', 'codex', 'both']) {
    test(`${workflow}/${agent}: setup, MCP syntax and idempotence`, (t) => {
      const target = path.join(temp(t), 'new project');
      const result = apply({ ...options, target, workflow, agent });
      assert.ok(result.changed > 0);
      assert.equal(checkTarget(target).connections, 'not-verified');
      const installed = fs.readdirSync(path.join(target, '.agents/skills')).sort();
      assert.deepEqual(installed, [...data.profiles.core, ...data.profiles[workflow]].sort());
      if (agent !== 'codex') {
        for (const name of installed) {
          const file = path.join(target, '.claude/skills', name);
          assert.ok(fs.lstatSync(file).isSymbolicLink());
          assert.ok(!path.isAbsolute(fs.readlinkSync(file)));
          assert.equal(fs.realpathSync(file), path.join(target, '.agents/skills', name));
        }
        assert.equal(JSON.parse(read(target, '.mcp.json')).mcpServers.context7.url, 'https://mcp.context7.com/mcp');
      } else assert.ok(!fs.existsSync(path.join(target, '.claude')));
      if (agent !== 'claude') assert.equal(parseTOML(read(target, '.codex/config.toml')).mcp_servers.context7.url, 'https://mcp.context7.com/mcp');
      else assert.ok(!fs.existsSync(path.join(target, '.codex')));
      assert.equal(apply({ ...options, target, workflow, agent }).changed, 0);
    });
  }
}

test('dry-run leaves nonexistent target and parents untouched', (t) => {
  const dir = temp(t);
  const target = path.join(dir, 'not created', 'project');
  assert.equal(apply({ ...options, target, dryRun: true }).dryRun, true);
  assert.deepEqual(fs.readdirSync(dir), []);
});

test('required selections, invalid options and unsafe targets fail before writing', (t) => {
  const dir = temp(t);
  const target = path.join(dir, 'project');
  for (const extra of [{ workflow: undefined }, { tracker: undefined }, { packs: ['missing'] }, { agent: 'bad' }, { mcps: ['unknown'] }, { workflow: ['aihero', 'superpowers'] }]) assert.throws(() => apply({ ...options, target, ...extra }));
  assert.throws(() => apply({ ...options, target: ROOT }));
  assert.deepEqual(fs.readdirSync(dir), []);
  assert.notEqual(cli('apply', '--target', target, '--workflow', 'aihero').status, 0);
  assert.notEqual(cli('apply', '--target', target, '--workflow', 'aihero', '--workflow', 'superpowers', '--tracker', 'local').status, 0);
});

test('an existing user file aborts the entire operation', (t) => {
  const target = temp(t);
  fs.writeFileSync(path.join(target, 'AGENTS.md'), 'user instructions\n');
  assert.throws(() => apply({ ...options, target }), /file người dùng/);
  assert.deepEqual(fs.readdirSync(target), ['AGENTS.md']);
  assert.equal(read(target, 'AGENTS.md'), 'user instructions\n');
});

test('modified and deleted owned files are protected even during dry-run', (t) => {
  const target = temp(t);
  apply({ ...options, target });
  const before = read(target, '.ai-toolkit/state.json');
  fs.appendFileSync(path.join(target, 'AGENTS.md'), '\nUser addition');
  assert.throws(() => apply({ ...options, target, packs: ['frontend'], dryRun: true }), /đã sửa/);
  assert.throws(() => checkTarget(target), /bị sửa/);
  assert.equal(read(target, '.ai-toolkit/state.json'), before);
  fs.unlinkSync(path.join(target, 'AGENTS.md'));
  assert.throws(() => apply({ ...options, target }), /đã sửa\/xóa/);
});

test('existing MCP config is preserved with no partial skill installation', (t) => {
  const target = temp(t);
  fs.writeFileSync(path.join(target, '.mcp.json'), '{"mcpServers":{"user":{}}}');
  assert.throws(() => apply({ ...options, target }), /file người dùng/);
  assert.deepEqual(fs.readdirSync(target), ['.mcp.json']);
});

test('symlinked output directories cannot write outside the project', (t) => {
  const parent = temp(t), target = path.join(parent, 'project'), outside = path.join(parent, 'outside');
  fs.mkdirSync(target); fs.mkdirSync(outside);
  fs.symlinkSync(outside, path.join(target, '.agents'), 'dir');
  assert.throws(() => apply({ ...options, target }), /không an toàn/);
  assert.deepEqual(fs.readdirSync(outside), []);
});

test('switching workflow removes only owned files and preserves unrelated additions', (t) => {
  const target = temp(t);
  apply({ ...options, target, packs: ['review'] });
  fs.mkdirSync(path.join(target, '.agents/skills/user-skill'));
  fs.writeFileSync(path.join(target, '.agents/skills/user-skill/SKILL.md'), 'user skill');
  apply({ ...options, target, workflow: 'superpowers' });
  assert.ok(!fs.existsSync(path.join(target, '.agents/skills/ai-dev/SKILL.md')));
  assert.ok(!fs.lstatSync(path.join(target, '.claude/skills/ai-dev'), { throwIfNoEntry: false }));
  assert.ok(fs.existsSync(path.join(target, '.agents/skills/brainstorming/SKILL.md')));
  assert.equal(read(target, '.agents/skills/user-skill/SKILL.md'), 'user skill');
  assert.equal(checkTarget(target).workflow, 'superpowers');
});

test('unmanaged opposite workflow blocks setup', (t) => {
  const target = temp(t);
  fs.mkdirSync(path.join(target, '.agents/skills/brainstorming'), { recursive: true });
  fs.writeFileSync(path.join(target, '.agents/skills/brainstorming/SKILL.md'), 'existing');
  assert.throws(() => apply({ ...options, target }), /Workflow khác/);
  assert.ok(!fs.existsSync(path.join(target, '.ai-toolkit')));
});

test('check detects an opposite workflow added after setup', (t) => {
  const target = temp(t);
  apply({ ...options, target });
  fs.mkdirSync(path.join(target, '.agents/skills/brainstorming'), { recursive: true });
  fs.writeFileSync(path.join(target, '.agents/skills/brainstorming/SKILL.md'), 'manually installed');
  assert.throws(() => checkTarget(target), /Workflow khác/);
});

test('all packs, additional MCPs and portable copied project', (t) => {
  const parent = temp(t), target = path.join(parent, 'original'), moved = path.join(parent, 'moved');
  const packs = Object.keys(data.packs);
  apply({ ...options, target, packs, mcps: ['playwright', 'github'] });
  const claude = JSON.parse(read(target, '.mcp.json')).mcpServers;
  const codex = parseTOML(read(target, '.codex/config.toml')).mcp_servers;
  assert.deepEqual(claude.playwright.args, codex.playwright.args);
  assert.equal(codex.github.bearer_token_env_var, 'GITHUB_MCP_TOKEN');
  assert.equal(claude.github.headers.Authorization, 'Bearer ${GITHUB_MCP_TOKEN}');
  assert.ok(claude.playwright.args[1].includes('@0.0.84'));
  fs.cpSync(target, moved, { recursive: true, verbatimSymlinks: true });
  fs.rmSync(target, { recursive: true });
  assert.equal(checkTarget(moved).workflow, 'aihero');
  for (const name of fs.readdirSync(path.join(moved, '.claude/skills'))) assert.ok(fs.realpathSync(path.join(moved, '.claude/skills', name)).startsWith(moved + path.sep));
  assert.ok(!read(moved, '.ai-toolkit/provenance.json').includes(ROOT));
});

test('GitHub tracker requires a destination and performs no issue/network calls', (t) => {
  const target = path.join(temp(t), 'project');
  assert.throws(() => apply({ ...options, target, tracker: 'github' }), /github-repo/);
  apply({ ...options, target, tracker: 'github', githubRepo: 'example/project' });
  assert.match(read(target, 'docs/agents/issue-tracker.md'), /example\/project/);
  assert.equal(state(target).options.githubRepo, 'example/project');
  assert.ok(!fs.existsSync(path.join(target, '.git')));
});

test('GitHub destination is inferred from a local remote without contacting it', (t) => {
  const target = temp(t);
  execFileSync('git', ['init', '--quiet', target]);
  execFileSync('git', ['-C', target, 'remote', 'add', 'origin', 'git@github.com:example/existing.git']);
  apply({ ...options, target, tracker: 'github' });
  assert.equal(state(target).options.githubRepo, 'example/existing');
});

test('malicious ownership traversal is rejected', (t) => {
  const target = temp(t);
  apply({ ...options, target });
  const changed = state(target);
  changed.files['../outside'] = 'file:fake:-';
  fs.writeFileSync(path.join(target, '.ai-toolkit/state.json'), JSON.stringify(changed));
  assert.throws(() => apply({ ...options, target }), /Đường dẫn/);
});

test('write failures roll back installed files and retain user content', (t) => {
  const target = temp(t);
  fs.writeFileSync(path.join(target, 'user.txt'), 'keep');
  const original = fs.writeFileSync;
  let failed = false;
  t.mock.method(fs, 'writeFileSync', function (file, ...args) {
    if (!failed && file === path.join(target, '.mcp.json')) { failed = true; throw new Error('simulated disk error'); }
    return original.call(this, file, ...args);
  });
  assert.throws(() => apply({ ...options, target }), /simulated disk error/);
  assert.equal(read(target, 'user.txt'), 'keep');
  assert.deepEqual(filesIn(target), ['user.txt']);
});

test('failed updates restore the previous configuration and ownership state', (t) => {
  const target = temp(t);
  apply({ ...options, target });
  const snapshot = (relative) => {
    const file = path.join(target, relative);
    return fs.lstatSync(file).isSymbolicLink() ? fs.readlinkSync(file) : fs.readFileSync(file);
  };
  const before = new Map([...Object.keys(state(target).files), '.ai-toolkit/state.json'].map((relative) => [relative, snapshot(relative)]));
  const original = fs.writeFileSync;
  let failed = false;
  t.mock.method(fs, 'writeFileSync', function (file, ...args) {
    if (!failed && file === path.join(target, '.mcp.json')) { failed = true; throw new Error('update disk error'); }
    return original.call(this, file, ...args);
  });
  assert.throws(() => apply({ ...options, target, packs: ['review'], mcps: ['github'] }), /update disk error/);
  assert.equal(checkTarget(target).workflow, 'aihero');
  assert.deepEqual(Object.keys(state(target).files).sort(), [...before.keys()].filter((relative) => relative !== '.ai-toolkit/state.json').sort());
  for (const [relative, bytes] of before) assert.deepEqual(snapshot(relative), bytes);
});

test('CLI catalog and generated workflow syntax are parseable', () => {
  const result = cli('catalog', '--json');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).version, 1);
  const workflow = YAML.parse(fs.readFileSync(path.join(ROOT, '.github/workflows/check.yml'), 'utf8'));
  assert.deepEqual(workflow.jobs.validate.strategy.matrix.os, ['ubuntu-latest', 'macos-latest']);
});
