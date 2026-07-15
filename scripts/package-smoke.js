import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const requiredFiles = [
  'bin/cli.js',
  'src/index.js',
  'fixtures/clean-skill/SKILL.md',
  'SKILL.md',
  'README.md',
  'LICENSE',
];

const result = spawnSync('npm', ['pack', '--dry-run', '--json'], {
  encoding: 'utf8',
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const [packument] = JSON.parse(result.stdout);
const packedFiles = new Set(packument.files.map((file) => file.path));
const missing = requiredFiles.filter((file) => !packedFiles.has(file));

if (missing.length > 0) {
  console.error(`package smoke failed; missing files: ${missing.join(', ')}`);
  process.exit(1);
}

const help = spawnSync('node', ['bin/cli.js', '--help'], { encoding: 'utf8' });
if (help.status !== 0 || !help.stdout.includes('Usage: skill-portability-audit')) {
  console.error('package smoke failed; CLI help output is missing usage text');
  process.exit(1);
}

const version = spawnSync('node', ['bin/cli.js', '--version'], { encoding: 'utf8' });
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
if (version.status !== 0 || version.stdout.trim() !== packageJson.version) {
  console.error('package smoke failed; CLI version output does not match package.json');
  process.exit(1);
}

console.log(`package smoke passed; checked ${requiredFiles.length} required files`);
