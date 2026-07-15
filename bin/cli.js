#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { auditSkill, renderMarkdown } from '../src/index.js';

const args = process.argv.slice(2);
const json = args.includes('--json');
const root = args.find(arg => !arg.startsWith('--')) || process.cwd();

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write('Usage: skill-portability-audit [skill-dir] [--json]\n');
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
