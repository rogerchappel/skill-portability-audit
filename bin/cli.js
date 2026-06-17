import { auditSkill, renderMarkdown } from '../src/index.js';

const args = process.argv.slice(2);
const json = args.includes('--json');
const root = args.find(arg => !arg.startsWith('--')) || process.cwd();
const report = auditSkill(root);
process.stdout.write(json ? `${JSON.stringify(report, null, 2)}\n` : renderMarkdown(report));
process.exitCode = report.passed ? 0 : 1;
