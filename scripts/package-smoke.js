import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const requiredFiles = [
  'bin/cli.js',
  'src/index.js',
  'fixtures/clean-skill/SKILL.md',
  'SKILL.md',
  'README.md',
  'LICENSE',
];

const root = mkdtempSync(join(tmpdir(), 'skill-portability-audit-package-'));

try {
  const result = spawnSync('npm', ['pack', '--json', '--pack-destination', root], {
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

  writeFileSync(join(root, 'package.json'), '{"private":true,"type":"module"}\n');
  const install = spawnSync(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', join(root, packument.filename)],
    { cwd: root, encoding: 'utf8' }
  );
  if (install.status !== 0) {
    process.stderr.write(install.stderr);
    process.exit(install.status ?? 1);
  }

  const imported = spawnSync(
    'node',
    [
      '--input-type=module',
      '--eval',
      "import { auditSkill, renderMarkdown } from 'skill-portability-audit'; if (typeof auditSkill !== 'function' || typeof renderMarkdown !== 'function') process.exit(1);",
    ],
    { cwd: root, encoding: 'utf8' }
  );
  if (imported.status !== 0) {
    process.stderr.write(imported.stderr);
    process.exit(imported.status ?? 1);
  }

  const help = spawnSync(join(root, 'node_modules/.bin/skill-portability-audit'), ['--help'], {
    cwd: root,
    encoding: 'utf8',
  });
  if (help.status !== 0 || !help.stdout.includes('Usage: skill-portability-audit')) {
    console.error('package smoke failed; installed CLI help output is missing usage text');
    process.exit(1);
  }

  const version = spawnSync(join(root, 'node_modules/.bin/skill-portability-audit'), ['--version'], {
    cwd: root,
    encoding: 'utf8',
  });
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  if (version.status !== 0 || version.stdout.trim() !== packageJson.version) {
    console.error('package smoke failed; installed CLI version output does not match package.json');
    process.exit(1);
  }

  const invalid = spawnSync(
    join(root, 'node_modules/.bin/skill-portability-audit'),
    ['fixtures/clean-skill', '--bogus'],
    { cwd: root, encoding: 'utf8' }
  );
  if (invalid.status !== 2 || !invalid.stderr.includes('Unknown option: --bogus')) {
    console.error('package smoke failed; installed CLI accepted an unknown option');
    process.exit(1);
  }

  const installedCli = join(root, 'node_modules/.bin/skill-portability-audit');
  writeFileSync(join(root, 'unapproved-skill.md'), '# Test\n\nPost a message to the project channel. Run validation.\n');
  writeFileSync(join(root, 'approved-skill.md'), '# Test\n\nPosting and messaging require explicit approval. Run validation.\n');

  const unapproved = spawnSync(installedCli, [join(root, 'unapproved-skill.md'), '--json'], {
    cwd: root,
    encoding: 'utf8',
  });
  const unapprovedReport = JSON.parse(unapproved.stdout);
  if (unapproved.status !== 1 || !unapprovedReport.findings.some(item => item.rule === 'unclear-approval')) {
    console.error('package smoke failed; installed CLI accepted unapproved posting and messaging');
    process.exit(1);
  }

  const approved = spawnSync(installedCli, [join(root, 'approved-skill.md'), '--json'], {
    cwd: root,
    encoding: 'utf8',
  });
  const approvedReport = JSON.parse(approved.stdout);
  if (approved.status !== 0 || approvedReport.findings.some(item => item.rule === 'unclear-approval')) {
    console.error('package smoke failed; installed CLI rejected same-clause approval');
    process.exit(1);
  }

  console.log(`package smoke passed; installed package exposes library API and CLI (${requiredFiles.length} required files)`);
} finally {
  rmSync(root, { recursive: true, force: true });
}
