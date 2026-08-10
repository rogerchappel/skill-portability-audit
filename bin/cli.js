#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { auditSkill, renderMarkdown } from '../src/index.js';

const args = process.argv.slice(2);
const usage = 'Usage: skill-portability-audit [skill-dir|markdown-file] [--json]\n';
const knownOptions = new Set(['--json', '--help', '-h', '--version']);
const unknownOption = args.find(arg => arg.startsWith('-') && !knownOptions.has(arg));
const targets = args.filter(arg => !arg.startsWith('-'));

function failUsage(message) {
  process.stderr.write(`Error: ${message}\n${usage}`);
  process.exit(2);
}

if (unknownOption) failUsage(`Unknown option: ${unknownOption}`);
if (targets.length > 1) failUsage('Expected at most one skill target.');

const json = args.includes('--json');
const root = targets[0] || process.cwd();

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(usage);
  process.exit(0);
}

if (args.includes('--version')) {
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  process.stdout.write(`${packageJson.version}\n`);
  process.exit(0);
}

const report = auditSkill(root);
process.stdout.write(json ? `${JSON.stringify(report, null, 2)}\n` : renderMarkdown(report));
process.exitCode = report.passed ? 0 : 1;
