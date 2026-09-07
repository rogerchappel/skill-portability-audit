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
  if (/(?:\b(?:do(?:es)?|did|is|was|are|were|will|would|should|must|may|might|can|could)\s+not\b|\bno\b)[^.?!;]*\b(?:approval|permission|confirmation)\b/i.test(text)) return false;
  const approval = String.raw`(?:approval|permission|confirmation)`;
  const qualifier = String.raw`(?:explicit\s+|prior\s+|user\s+)*`;
  return new RegExp(
    String.raw`(?:\b(?:require[sd]?|requiring|obtain|request|receive|get|ask\s+for)\s+${qualifier}${approval}\b|(?<!\bno\s)\b${approval}\s+(?:is\s+|must\s+be\s+)?(?:required|needed|obtained|requested|confirmed)\b|\b(?:with|after|pending)\s+${qualifier}${approval}\b)`,
    'i'
  ).test(text);
}

function isActionCoveredByApproval(clause, actionIndex) {
  if (!hasAffirmativeApprovalLanguage(clause)) return false;

  const approval = String.raw`(?:approval|permission|confirmation)`;
  const forwardRequirement = new RegExp(
    String.raw`\b${approval}\s+(?:is\s+|must\s+be\s+)?(?:required|needed|obtained|requested|confirmed)\s+before\b`,
    'i'
  ).exec(clause);

  return !forwardRequirement || actionIndex > forwardRequirement.index;
}

function isExplicitlyProhibited(clause, actionIndex) {
  const prefix = clause.slice(0, actionIndex);
  const negations = [...prefix.matchAll(/\b(?:never|(?:do(?:es)?|did|will|would|shall|should|must|may|might|can|could)\s+not)\b/gi)];
  const negation = negations.at(-1);
  if (!negation) return false;
  return !/\b(?:approval|permission|confirmation)\b/i.test(prefix.slice(negation.index));
}

function proseWithoutCodeOrUrls(text) {
  return text
    .replace(/(^|\n)[ \t]*(```|~~~)[^\n]*\n[\s\S]*?\n[ \t]*\2(?=\n|$)/g, '$1')
    .replace(/`[^`\n]*`/g, '')
    .replace(/\b(?:https?|file):\/\/\S+/gi, '');
}

function hasMachineSpecificAbsolutePath(text) {
  const prose = proseWithoutCodeOrUrls(text);
  const homeOrWindowsUserPath = /\/Users\/|\/home\/|[A-Z]:[\\/]+Users[\\/]/i;
  const hostSpecificPosixPath = /(^|[\s(\[{'"])(?:\/(?:opt|var|etc|srv|private|tmp|Applications|Volumes)\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*)/m;
  return homeOrWindowsUserPath.test(prose) || hostSpecificPosixPath.test(prose);
}

function findUnapprovedSideEffects(text) {
  const statements = text.split(/(?<=[.!?])(?:[ \t]+|\r?\n+)|\r?\n+|\s*;\s*/);
  const contrastiveBoundary = /\s*(?:[,;:]\s*)?\b(?:but|however|whereas|while)\b\s*/i;
  const sequentialBoundary = /\s*,\s*\b(?:then|next|afterwards|subsequently|finally)\b\s*/i;
  const sideEffect = /\b(publish(?:es|ed|ing)?|post(?:s|ed|ing)?(?!-)|deploy(?:s|ed|ing)?|send(?:s|ing)?|sent|messag(?:e|es|ed|ing)|delet(?:e|es|ed|ing)|remov(?:e|es|ed|ing)|overwrit(?:e|es|ten|ing)|merg(?:e|es|ed|ing)|charg(?:e|es|ed|ing)|email(?:s|ed|ing)?)\b/gi;
  const findings = [];

  for (const statement of statements) {
    for (const clause of statement.split(contrastiveBoundary).flatMap(part => part.split(sequentialBoundary))) {
      for (const match of clause.matchAll(sideEffect)) {
        if (!isExplicitlyProhibited(clause, match.index) && !isActionCoveredByApproval(clause, match.index)) {
          findings.push(match[0].toLowerCase());
        }
      }
    }
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
    if (hasMachineSpecificAbsolutePath(text)) findings.push({ level: 'error', file: rel, rule: 'absolute-path', message: 'Avoid machine-specific absolute paths.' });
    if (/\b(API_KEY|TOKEN|SECRET|PASSWORD)\b/.test(text)) findings.push({ level: 'warn', file: rel, rule: 'secret-env', message: 'Document env vars without exposing values.' });
    for (const action of findUnapprovedSideEffects(text)) {
      findings.push({ level: 'error', file: rel, rule: 'unclear-approval', message: `External side effect "${action}" needs explicit approval language in the same clause.` });
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
