#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import YAML from 'yaml';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE = '.ai-toolkit/state.json';
const json = (value) => JSON.stringify(value, null, 2) + '\n';
const hash = (data) => createHash('sha256').update(data).digest('hex');
const readJSON = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const fail = (message) => { throw new Error(message); };
const inside = (parent, child) => child === parent || child.startsWith(parent + path.sep);

export function filesIn(directory, prefix = '') {
  return fs.readdirSync(directory).sort().flatMap((name) => {
    const relative = prefix + name;
    const file = path.join(directory, name);
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) fail(`Symlink không được phép trong snapshot: ${file}`);
    if (stat.isDirectory()) return filesIn(file, relative + '/');
    if (!stat.isFile()) fail(`Loại file không hỗ trợ: ${file}`);
    return [relative];
  });
}

export function treeHash(directory) {
  return hash(filesIn(directory).map((relative) => {
    const file = path.join(directory, relative);
    return `${relative}\0${hash(fs.readFileSync(file))}\0${fs.statSync(file).mode & 0o111 ? 'x' : '-'}\n`;
  }).join(''));
}

function manifest() {
  const data = readJSON(path.join(ROOT, 'catalog/manifest.json'));
  if (data.version !== 1) fail('Manifest version không hỗ trợ.');
  return data;
}

function safeRelative(relative) {
  if (typeof relative !== 'string' || !relative || relative.includes('\\') || relative.includes('\0') || path.isAbsolute(relative) || relative.split('/').some((part) => !part || part === '.' || part === '..')) {
    fail(`Đường dẫn không hợp lệ: ${relative}`);
  }
  return relative;
}

function sourceDirectory(skill) {
  return path.join(ROOT, safeRelative(skill.path));
}

export function checkRepository() {
  const data = manifest();
  const names = new Set();
  for (const skill of data.skills) {
    if (!/^[a-z0-9-]{1,64}$/.test(skill.id) || names.has(skill.id)) fail(`Skill id không hợp lệ/trùng: ${skill.id}`);
    names.add(skill.id);
    if (!skill.source || !skill.revision || !skill.license || !skill.review?.report || skill.review.status !== 'safe-with-caveats') fail(`Thiếu provenance/review: ${skill.id}`);
    if (!fs.existsSync(path.join(ROOT, safeRelative(skill.review.report)))) fail(`Thiếu review: ${skill.id}`);
    const directory = sourceDirectory(skill);
    if (treeHash(directory) !== skill.sha256) fail(`Checksum snapshot sai: ${skill.id}`);
    const text = fs.readFileSync(path.join(directory, 'SKILL.md'), 'utf8');
    const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!front) fail(`Thiếu frontmatter: ${skill.id}`);
    const meta = YAML.parse(front[1]);
    if (meta.name !== skill.id || typeof meta.description !== 'string' || !meta.description.trim()) fail(`Metadata sai: ${skill.id}`);
    if (meta.hooks) fail(`Hook tự chạy không được phép: ${skill.id}`);
    // Check concrete entrypoint links, not sample links inside fenced examples.
    const body = text.slice(front[0].length).replace(/```[^\n]*\n[\s\S]*?```/g, '');
    for (const match of body.matchAll(/\]\(([^\s)]+)\)/g)) {
      const link = match[1].split('#')[0];
      if (!link || /^[a-z][a-z0-9+.-]*:/.test(link) || link.startsWith('/') || /[<>{}]/.test(link)) continue;
      const destination = path.resolve(directory, decodeURIComponent(link));
      const snapshotRoot = skill.path.startsWith('vendor/') ? path.join(ROOT, 'vendor/skills') : directory;
      if (!inside(snapshotRoot, destination) || !fs.existsSync(destination)) fail(`Thiếu reference ${skill.id}: ${link}`);
    }
  }
  for (const [profile, ids] of Object.entries(data.profiles)) {
    if (!['core', 'aihero'].includes(profile) || ids.some((id) => !names.has(id))) fail(`Profile sai: ${profile}`);
  }
  for (const profile of ['core', 'aihero']) if (!Array.isArray(data.profiles[profile]) || !data.profiles[profile].length) fail(`Thiếu profile: ${profile}`);
  for (const skill of data.skills) if (skill.patch && !fs.existsSync(path.join(ROOT, safeRelative(skill.patch)))) fail(`Thiếu patch: ${skill.id}`);
  for (const [pack, ids] of Object.entries(data.packs)) {
    if (ids.some((id) => !names.has(id))) fail(`Pack sai: ${pack}`);
  }
  return { skills: names.size, profiles: Object.keys(data.profiles), packs: Object.keys(data.packs) };
}

function canonicalTarget(input) {
  if (!input) fail('Thiếu --target.');
  let existing = path.resolve(input);
  const suffix = [];
  while (!fs.existsSync(existing)) {
    suffix.unshift(path.basename(existing));
    const parent = path.dirname(existing);
    if (parent === existing) fail('Không tìm thấy thư mục cha của target.');
    existing = parent;
  }
  if (!fs.statSync(existing).isDirectory()) fail(`Target/parent không phải thư mục: ${existing}`);
  return path.join(fs.realpathSync(existing), ...suffix);
}

function validateOptions(options, data) {
  if (options.workflow !== 'aihero') fail('Workflow được hỗ trợ: --workflow aihero.');
  if (!['local', 'github'].includes(options.tracker)) fail('Chọn --tracker local|github.');
  if (!['claude', 'codex', 'both'].includes(options.agent)) fail('Chọn --agent claude|codex|both.');
  for (const pack of options.packs) if (!Object.hasOwn(data.packs, pack)) fail(`Pack không tồn tại: ${pack}`);
  for (const mcp of options.mcps) if (!Object.hasOwn(data.mcp, mcp)) fail(`MCP không tồn tại: ${mcp}`);
  if (options.tracker === 'github' && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(options.githubRepo || '')) fail('Tracker GitHub cần --github-repo owner/repo hoặc remote origin hợp lệ.');
}

function inferGitHub(target) {
  try {
    const remote = execFileSync('git', ['-C', target, 'remote', 'get-url', 'origin'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return remote.match(/^(?:https:\/\/github\.com\/|git@github\.com:)([\w.-]+\/[\w.-]+?)(?:\.git)?$/)?.[1];
  } catch { return undefined; }
}

function selectedSkills(options, data) {
  const ids = new Set([...data.profiles.core, ...data.profiles[options.workflow], ...options.packs.flatMap((pack) => data.packs[pack])]);
  return data.skills.filter((skill) => ids.has(skill.id));
}

function fileEntry(content, executable = false) {
  const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return { type: 'file', content: bytes, executable, fingerprint: `file:${hash(bytes)}:${executable ? 'x' : '-'}` };
}

function planFiles(options, data) {
  const plan = new Map();
  const add = (relative, text) => plan.set(relative, fileEntry(text));
  const skills = selectedSkills(options, data);
  for (const skill of skills) {
    const directory = sourceDirectory(skill);
    for (const relative of filesIn(directory)) {
      const source = path.join(directory, relative);
      plan.set(`.agents/skills/${skill.id}/${relative}`, fileEntry(fs.readFileSync(source), Boolean(fs.statSync(source).mode & 0o111)));
    }
    if (options.agent !== 'codex') {
      const link = `../../.agents/skills/${skill.id}`;
      plan.set(`.claude/skills/${skill.id}`, { type: 'link', link, fingerprint: `link:${link}` });
    }
  }
  const guide = fs.readFileSync(path.join(ROOT, 'templates/agent-guide.md'), 'utf8').replaceAll('{{workflow}}', options.workflow).replaceAll('{{tracker}}', options.tracker);
  add('AGENTS.md', guide);
  if (options.agent !== 'codex') add('CLAUDE.md', '@AGENTS.md\n');
  const tracking = options.tracker === 'local'
    ? 'Lưu spec ở docs/specs/, kế hoạch ở docs/plans/, mỗi ticket một file ở docs/tickets/. Ghi ID phụ thuộc trong ticket; không cần dịch vụ ngoài.'
    : `Đích GitHub: ${options.githubRepo}. Spec/ticket dùng GitHub Issues; bản nháp ở docs/specs/ và docs/tickets/. Trước lần publish phải có yêu cầu cụ thể của người dùng. Dùng gh CLI hoặc connector GitHub đã xác thực; nếu thiếu, báo not configured và giữ bản nháp local.`;
  add('docs/agents/issue-tracker.md', `# Issue tracker\n\n${tracking}\n\nSetup không tạo Issues, labels hay bình luận. PRs không phải request surface mặc định.\n`);
  add('docs/agents/domain.md', '# Domain documents\n\nDùng glossary và ADR hiện có của dự án. Nếu chưa có, chỉ tạo GLOSSARY.md hoặc docs/adr/ khi phát sinh thuật ngữ/quyết định thật; không suy diễn nghiệp vụ từ project khác.\n');
  const workflow = 'Bắt đầu bằng ai-dev; flow: grill-with-docs → to-spec → to-tickets → implement → code-review. Debug bằng diagnosing-bugs; dùng tdd ở hành vi cần kiểm tra. Tracker và domain docs đã được CLI cấu hình; không cần chạy setup-matt-pocock-skills lần nữa.';
  add('docs/agents/toolkit.md', `# Toolkit của dự án\n\n${workflow}\n\nSkill đã cài: ${skills.map((skill) => skill.id).join(', ')}.\n\nSpec/kế hoạch local: docs/specs/, docs/plans/; ticket theo issue-tracker.md. Đây là lựa chọn đường dẫn của dự án, thay thế mặc định upstream. Ưu tiên chỉ dẫn người dùng hơn skill. Không tự sửa global config, bật hook, publish, pentest, deploy hoặc cross-review.\n\nMCP: ${options.mcps.join(', ')}. Cấu hình không chứng minh đã kết nối; xác minh trong phiên Claude/Codex và xác thực dịch vụ khi cần. Không ghi token vào file.\n\nReview và nguồn: xem snapshots trong .ai-toolkit/provenance.json; các script vendored chỉ được rà soát tĩnh, chưa được chạy thử. Phần tài liệu cần LibreOffice/Python và dependency riêng, không tự cài chúng.\n`);
  add('.ai-toolkit/provenance.json', json(skills));
  const servers = Object.fromEntries(options.mcps.map((id) => [id, data.mcp[id].claude]));
  if (options.agent !== 'codex') add('.mcp.json', json({ mcpServers: servers }));
  if (options.agent !== 'claude') add('.codex/config.toml', '# Generated project MCP configuration. Trust this project in Codex before loading.\n\n' + options.mcps.map((id) => data.mcp[id].codex).join('\n'));
  return plan;
}

function noSymlinkParents(target, relative) {
  safeRelative(relative);
  let current = target;
  for (const part of relative.split('/').slice(0, -1)) {
    current = path.join(current, part);
    try {
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) fail(`Thư mục đích không an toàn: ${current}`);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

function currentEntry(file) {
  let stat;
  try { stat = fs.lstatSync(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  if (stat.isSymbolicLink()) {
    const link = fs.readlinkSync(file);
    return { type: 'link', link, fingerprint: `link:${link}` };
  }
  if (!stat.isFile()) fail(`Xung đột: cần file nhưng gặp directory/special file ${file}`);
  return fileEntry(fs.readFileSync(file), Boolean(stat.mode & 0o111));
}

function loadState(target) {
  noSymlinkParents(target, STATE);
  const entry = currentEntry(path.join(target, STATE));
  if (!entry) return null;
  if (entry.type !== 'file') fail('State phải là file thường.');
  const state = JSON.parse(entry.content.toString());
  if (state.version !== 1 || !state.files || !state.options) fail('State không hợp lệ.');
  for (const [relative, fingerprint] of Object.entries(state.files)) {
    safeRelative(relative);
    if (relative === STATE || typeof fingerprint !== 'string' || !/^(?:AGENTS\.md|CLAUDE\.md|\.mcp\.json|\.codex\/config\.toml|docs\/agents\/(?:toolkit|domain|issue-tracker)\.md|\.ai-toolkit\/provenance\.json|\.agents\/skills\/[a-z0-9-]+\/.+|\.claude\/skills\/[a-z0-9-]+)$/.test(relative)) fail('Ownership path không hợp lệ.');
  }
  return state;
}

function put(file, entry) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (entry.type === 'link') {
    fs.symlinkSync(entry.link, file, 'dir');
  } else {
    fs.writeFileSync(file, entry.content, { flag: 'wx', mode: entry.executable ? 0o755 : 0o644 });
    fs.chmodSync(file, entry.executable ? 0o755 : 0o644);
  }
}

export function apply(rawOptions) {
  checkRepository();
  const data = manifest();
  const target = canonicalTarget(rawOptions.target);
  if (inside(target, ROOT) || target === os.homedir() || target === path.parse(target).root) fail('Chọn project đích riêng; không áp dụng lên toolkit, home hoặc root.');
  const options = {
    workflow: rawOptions.workflow, tracker: rawOptions.tracker, agent: rawOptions.agent || 'both',
    packs: [...new Set(rawOptions.packs || [])].sort(),
    mcps: [...new Set(['context7', ...(rawOptions.mcps || [])])].sort(),
    ...(rawOptions.tracker === 'github' ? { githubRepo: rawOptions.githubRepo || inferGitHub(target) } : {}),
  };
  validateOptions(options, data);
  const old = loadState(target);
  const plan = planFiles(options, data);
  const all = new Set([...Object.keys(old?.files || {}), ...plan.keys(), STATE]);
  const before = new Map();
  // Complete preflight before creating even the target directory.
  for (const relative of all) {
    noSymlinkParents(target, relative);
    const current = currentEntry(path.join(target, relative));
    before.set(relative, current);
    if (relative === STATE) continue;
    const owned = old?.files[relative];
    if (owned && current?.fingerprint !== owned) fail(`Xung đột file toolkit đã sửa/xóa: ${relative}. Hợp nhất thủ công trước khi chạy lại.`);
    if (!owned && current) fail(`Xung đột file người dùng: ${relative}. Hợp nhất thủ công; toolkit chưa ghi file nào.`);
  }
  const state = { version: 1, options, files: Object.fromEntries([...plan].map(([relative, entry]) => [relative, entry.fingerprint])) };
  plan.set(STATE, fileEntry(json(state)));
  const changes = [...all].filter((relative) => before.get(relative)?.fingerprint !== plan.get(relative)?.fingerprint);
  const summary = { target, ...options, skills: selectedSkills(options, data).length, changed: changes.length, dryRun: Boolean(rawOptions.dryRun) };
  if (rawOptions.dryRun || !changes.length) return summary;
  const touched = [];
  try {
    for (const relative of changes) {
      noSymlinkParents(target, relative);
      const file = path.join(target, relative);
      if (currentEntry(file)?.fingerprint !== before.get(relative)?.fingerprint) fail(`File vừa thay đổi trong lúc apply: ${relative}`);
      touched.push(relative);
      if (before.get(relative)) fs.unlinkSync(file);
      if (plan.has(relative)) put(file, plan.get(relative));
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const relative of touched.reverse()) {
      try {
        const file = path.join(target, relative);
        noSymlinkParents(target, relative);
        if (fs.existsSync(file) || fs.lstatSync(file, { throwIfNoEntry: false })) fs.unlinkSync(file);
        if (before.get(relative)) put(file, before.get(relative));
      } catch (rollback) { rollbackErrors.push(`${relative}: ${rollback.message}`); }
    }
    if (rollbackErrors.length) error.message += '\nRollback cần kiểm tra: ' + rollbackErrors.join('; ');
    throw error;
  }
  return summary;
}

export function checkTarget(input) {
  const target = canonicalTarget(input);
  const state = loadState(target);
  if (!state) fail('Target chưa được setup.');
  const data = manifest();
  validateOptions(state.options, data);
  const expected = planFiles(state.options, data);
  if (JSON.stringify(Object.keys(state.files).sort()) !== JSON.stringify([...expected.keys()].sort())) fail('Ownership inventory không khớp với profile.');
  for (const [relative, fingerprint] of Object.entries(state.files)) {
    noSymlinkParents(target, relative);
    if (currentEntry(path.join(target, relative))?.fingerprint !== fingerprint) fail(`Target bị sửa/thiếu file: ${relative}`);
    if (expected.get(relative)?.fingerprint !== fingerprint) fail(`Snapshot đã có bản cập nhật; chạy apply để cập nhật: ${relative}`);
  }
  return { target, workflow: state.options.workflow, files: Object.keys(state.files).length, status: 'verified-files', connections: 'not-verified' };
}

function main() {
  const { values, positionals, tokens } = parseArgs({ options: {
    target: { type: 'string' }, workflow: { type: 'string' }, tracker: { type: 'string' },
    agent: { type: 'string' }, pack: { type: 'string', multiple: true }, mcp: { type: 'string', multiple: true },
    'github-repo': { type: 'string' }, 'dry-run': { type: 'boolean' }, json: { type: 'boolean' }, help: { type: 'boolean' },
  }, allowPositionals: true, tokens: true });
  const seen = new Set();
  for (const token of tokens) {
    if (token.kind !== 'option' || ['pack', 'mcp'].includes(token.name)) continue;
    if (seen.has(token.name)) fail(`Chỉ truyền --${token.name} một lần.`);
    seen.add(token.name);
  }
  const command = positionals[0];
  if (values.help || !command) {
    console.log('Node 24+. catalog [--json] | check [--target DIR] | apply --target DIR --workflow aihero --tracker local|github [--github-repo owner/repo] [--agent both|claude|codex] [--pack NAME] [--mcp playwright|github] [--dry-run]');
    return;
  }
  if (positionals.length !== 1) fail('Chỉ truyền một command.');
  if (command === 'catalog') {
    const data = manifest();
    if (values.json) console.log(json(data));
    else {
      console.log('Workflow: aihero\nCore: ' + data.profiles.core.join(', '));
      for (const [pack, skills] of Object.entries(data.packs)) console.log(`${pack}: ${skills.join(', ')}`);
      console.log('MCP: ' + Object.keys(data.mcp).join(', ') + '\nPlugin: xem catalog/plugins.json và docs/plugins.md');
    }
  } else if (command === 'check') console.log(json(values.target ? checkTarget(values.target) : checkRepository()));
  else if (command === 'apply') console.log(json(apply({ ...values, packs: (values.pack || []).flatMap((item) => item.split(',')), mcps: (values.mcp || []).flatMap((item) => item.split(',')), githubRepo: values['github-repo'], dryRun: values['dry-run'] })));
  else fail(`Command không tồn tại: ${command}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
