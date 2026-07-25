import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

function listMarkdown(root) {
  const out = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stat = lstatSync(path);
    if (stat.isDirectory() && !['node_modules','.git'].includes(entry)) out.push(...listMarkdown(path));
    if (stat.isFile() && /(^SKILL\.md$|\.md$)/.test(entry)) out.push(path);
  }
  return out;
}

function hasAffirmativeApprovalLanguage(text) {
  const approval = String.raw`(?:approval|permission|confirmation)`;
  const qualifier = String.raw`(?:explicit\s+|prior\s+|user\s+)*`;
  return new RegExp(
    String.raw`(?:\b(?:require[sd]?|requiring|obtain|request|receive|get|ask\s+for)\s+${qualifier}${approval}\b|(?<!\bno\s)\b${approval}\s+(?:is\s+|must\s+be\s+)?(?:required|needed|obtained|requested|confirmed)\b|\b(?:with|after|pending)\s+${qualifier}${approval}\b)`,
    'i'
  ).test(text);
}

function findUnapprovedSideEffects(text) {
  const statements = text.split(/(?<=[.!?])(?:[ \t]+|\r?\n+)|\r?\n+/);
  const sideEffect = /\b(publish(?:es|ed|ing)?|deploy(?:s|ed|ing)?|send(?:s|ing)?|sent|delet(?:e|es|ed|ing)|merg(?:e|es|ed|ing)|charg(?:e|es|ed|ing)|email(?:s|ed|ing)?)\b/gi;
  const findings = [];

  for (const statement of statements) {
    if (hasAffirmativeApprovalLanguage(statement)) continue;
    for (const match of statement.matchAll(sideEffect)) findings.push(match[0].toLowerCase());
  }

  return findings;
}

export function auditSkill(root) {
  const requestedPath = resolve(root);
  const requestedStat = lstatSync(requestedPath);
  const base = requestedStat.isFile() ? dirname(requestedPath) : requestedPath;
  const files = requestedStat.isFile() ? [requestedPath] : listMarkdown(requestedPath);
  const findings = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const rel = requestedStat.isFile() ? basename(file) : file.slice(base.length + 1);
    if (/\/Users\/|\/home\/|C:\\\\Users\\\\/.test(text)) findings.push({ level: 'error', file: rel, rule: 'absolute-path', message: 'Avoid machine-specific absolute paths.' });
    if (/\b(API_KEY|TOKEN|SECRET|PASSWORD)\b/.test(text)) findings.push({ level: 'warn', file: rel, rule: 'secret-env', message: 'Document env vars without exposing values.' });
    for (const action of findUnapprovedSideEffects(text)) {
      findings.push({ level: 'warn', file: rel, rule: 'unclear-approval', message: `External side effect "${action}" needs explicit approval language in the same statement.` });
    }
  }
  const skill = files.find(file => file.endsWith('SKILL.md'));
  if (!skill) findings.push({ level: 'error', file: '.', rule: 'missing-skill', message: 'Expected a SKILL.md file.' });
  const combined = files.map(file => readFileSync(file, 'utf8')).join('\n');
  if (!/verify|validation|test|smoke/i.test(combined)) findings.push({ level: 'warn', file: '.', rule: 'missing-verification', message: 'Add a validation or smoke workflow.' });
  return {
    root: requestedPath,
    files: files.map(file => requestedStat.isFile() ? basename(file) : file.slice(base.length + 1)),
    findings,
    passed: findings.every(item => item.level !== 'error')
  };
}

export function renderMarkdown(report) {
  const lines = ['# Skill Portability Audit', '', `Passed: ${report.passed ? 'yes' : 'no'}`, '', '## Files', ...report.files.map(file => `- ${file}`), '', '## Findings'];
  if (report.findings.length === 0) lines.push('- No findings.');
  for (const finding of report.findings) lines.push(`- ${finding.level} ${finding.rule} in ${finding.file}: ${finding.message}`);
  return lines.join('\n') + '\n';
}
