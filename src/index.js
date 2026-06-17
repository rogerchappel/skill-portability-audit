import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

function listMarkdown(root) {
  const out = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory() && !['node_modules','.git'].includes(entry)) out.push(...listMarkdown(path));
    if (stat.isFile() && /(^SKILL\.md$|\.md$)/.test(entry)) out.push(path);
  }
  return out;
}

export function auditSkill(root) {
  const base = resolve(root);
  const files = listMarkdown(base);
  const findings = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const rel = file.slice(base.length + 1);
    if (/\/Users\/|\/home\/|C:\\\\Users\\\\/.test(text)) findings.push({ level: 'error', file: rel, rule: 'absolute-path', message: 'Avoid machine-specific absolute paths.' });
    if (/\b(API_KEY|TOKEN|SECRET|PASSWORD)\b/.test(text)) findings.push({ level: 'warn', file: rel, rule: 'secret-env', message: 'Document env vars without exposing values.' });
    if (/\b(publish|deploy|send|delete|merge|charge|email)\b/i.test(text) && !/approval|permission|confirm/i.test(text)) findings.push({ level: 'warn', file: rel, rule: 'unclear-approval', message: 'External side effects need explicit approval language.' });
  }
  const skill = files.find(file => file.endsWith('SKILL.md'));
  if (!skill) findings.push({ level: 'error', file: '.', rule: 'missing-skill', message: 'Expected a SKILL.md file.' });
  const combined = files.map(file => readFileSync(file, 'utf8')).join('\n');
  if (!/verify|validation|test|smoke/i.test(combined)) findings.push({ level: 'warn', file: '.', rule: 'missing-verification', message: 'Add a validation or smoke workflow.' });
  return { root: base, files: files.map(file => file.slice(base.length + 1)), findings, passed: findings.every(item => item.level !== 'error') };
}

export function renderMarkdown(report) {
  const lines = ['# Skill Portability Audit', '', `Passed: ${report.passed ? 'yes' : 'no'}`, '', '## Files', ...report.files.map(file => `- ${file}`), '', '## Findings'];
  if (report.findings.length === 0) lines.push('- No findings.');
  for (const finding of report.findings) lines.push(`- ${finding.level} ${finding.rule} in ${finding.file}: ${finding.message}`);
  return lines.join('\n') + '\n';
}
