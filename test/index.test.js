import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditSkill } from '../src/index.js';

function createTemporarySkill(t) {
  const root = mkdtempSync(join(tmpdir(), 'skill-portability-audit-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'SKILL.md'), '# Test skill\n\nRun validation before use.\n');
  return root;
}

test('passes a portable skill fixture', () => {
  const report = auditSkill(new URL('../fixtures/clean-skill', import.meta.url).pathname);
  assert.equal(report.passed, true);
  assert.equal(report.findings.length, 0);
});

test('audits a direct SKILL.md file', () => {
  const skill = new URL('../fixtures/clean-skill/SKILL.md', import.meta.url).pathname;
  const report = auditSkill(skill);

  assert.equal(report.root, skill);
  assert.deepEqual(report.files, ['SKILL.md']);
  assert.equal(report.passed, true);
});

test('flags missing skill file and absolute paths', () => {
  const report = auditSkill(new URL('../fixtures/risky-skill', import.meta.url).pathname);
  assert.equal(report.passed, false);
  assert.ok(report.findings.some(item => item.rule === 'missing-skill'));
  assert.ok(report.findings.some(item => item.rule === 'absolute-path'));
});

for (const windowsPath of [
  String.raw`C:\Users\alice\tools`,
  String.raw`d:\users\bob\skill`,
  'E:/Users/carol/project',
]) {
  test(`flags Windows absolute path: ${windowsPath}`, t => {
    const root = createTemporarySkill(t);
    writeFileSync(join(root, 'SKILL.md'), `# Test skill\n\nUse ${windowsPath}.\nRun validation.\n`);

    const report = auditSkill(root);

    assert.equal(report.passed, false);
    assert.ok(report.findings.some(item => item.rule === 'absolute-path'));
  });
}

test('ignores a self-referential symbolic link', t => {
  const root = createTemporarySkill(t);
  symlinkSync('.', join(root, 'loop'));

  const report = auditSkill(root);

  assert.equal(report.passed, true);
  assert.deepEqual(report.files, ['SKILL.md']);
});

test('does not audit files through a symbolic link outside the skill root', t => {
  const root = createTemporarySkill(t);
  const external = mkdtempSync(join(tmpdir(), 'skill-portability-audit-external-'));
  t.after(() => rmSync(external, { recursive: true, force: true }));
  writeFileSync(join(external, 'README.md'), 'Read /Users/example/private.txt\n');
  symlinkSync(external, join(root, 'external'));

  const report = auditSkill(root);

  assert.equal(report.passed, true);
  assert.deepEqual(report.files, ['SKILL.md']);
  assert.equal(report.findings.some(item => item.rule === 'absolute-path'), false);
});

test('flags side effects when approval language is negated', t => {
  const root = createTemporarySkill(t);
  writeFileSync(join(root, 'SKILL.md'), '# Test\n\nPublish updates. No approval is required. Run validation.\n');

  const report = auditSkill(root);

  assert.equal(report.passed, false);
  assert.ok(report.findings.some(item => item.rule === 'unclear-approval'));
});

test('preserves affirmative approval language for side effects', t => {
  const root = createTemporarySkill(t);
  writeFileSync(join(root, 'SKILL.md'), '# Test\n\nPublishing updates requires approval. Run validation.\n');

  const report = auditSkill(root);

  assert.equal(report.findings.some(item => item.rule === 'unclear-approval'), false);
});

for (const action of ['Post an update', 'Posting an update', 'Message the project channel', 'Messaging the project channel']) {
  test(`flags unapproved live action: ${action}`, t => {
    const root = createTemporarySkill(t);
    writeFileSync(join(root, 'SKILL.md'), `# Test\n\n${action}. Run validation.\n`);

    const report = auditSkill(root);
    const approvalFindings = report.findings.filter(item => item.rule === 'unclear-approval');

    assert.equal(report.passed, false);
    assert.equal(approvalFindings.length, 1);
    assert.match(approvalFindings[0].message, new RegExp(action.split(' ')[0], 'i'));
  });
}

test('allows approved posting and messaging in the same clause', t => {
  const root = createTemporarySkill(t);
  writeFileSync(
    join(root, 'SKILL.md'),
    '# Test\n\nPosting updates and messaging the project channel require explicit approval. Run validation.\n'
  );

  const report = auditSkill(root);

  assert.equal(report.findings.some(item => item.rule === 'unclear-approval'), false);
});

test('associates approval with each action in a contrastive statement', t => {
  const root = createTemporarySkill(t);
  writeFileSync(
    join(root, 'SKILL.md'),
    '# Test\n\nApproval is required before deleting files, but publish automatically. Run validation.\n'
  );

  const report = auditSkill(root);
  const approvalFindings = report.findings.filter(item => item.rule === 'unclear-approval');

  assert.equal(report.passed, false);
  assert.equal(approvalFindings.length, 1);
  assert.match(approvalFindings[0].message, /publish/i);
  assert.doesNotMatch(approvalFindings[0].message, /delet/i);
});

test('treats a semicolon as an approval-scope boundary', t => {
  const root = createTemporarySkill(t);
  writeFileSync(
    join(root, 'SKILL.md'),
    '# Test\n\nApproval is required before deleting files; publish automatically. Run validation.\n'
  );

  const report = auditSkill(root);
  const approvalFindings = report.findings.filter(item => item.rule === 'unclear-approval');

  assert.equal(report.passed, false);
  assert.equal(approvalFindings.length, 1);
  assert.match(approvalFindings[0].message, /publish/i);
  assert.doesNotMatch(approvalFindings[0].message, /delet/i);
});

for (const transition of ['then', 'next', 'afterwards', 'subsequently', 'finally']) {
  test(`treats comma-${transition} as an approval-scope boundary`, t => {
    const root = createTemporarySkill(t);
    writeFileSync(
      join(root, 'SKILL.md'),
      `# Test\n\nApproval is required before deleting files, ${transition} publish automatically. Run validation.\n`
    );

    const report = auditSkill(root);
    const approvalFindings = report.findings.filter(item => item.rule === 'unclear-approval');

    assert.equal(report.passed, false);
    assert.equal(approvalFindings.length, 1);
    assert.match(approvalFindings[0].message, /publish/i);
    assert.doesNotMatch(approvalFindings[0].message, /delet/i);
  });
}

test('allows one affirmative requirement to cover compound actions', t => {
  const root = createTemporarySkill(t);
  writeFileSync(
    join(root, 'SKILL.md'),
    '# Test\n\nDeleting files and publishing releases require explicit approval. Run validation.\n'
  );

  const report = auditSkill(root);

  assert.equal(report.findings.some(item => item.rule === 'unclear-approval'), false);
});

for (const coordinator of ['and', 'or']) {
  test(`preserves explicitly coordinated actions joined by ${coordinator}`, t => {
    const root = createTemporarySkill(t);
    writeFileSync(
      join(root, 'SKILL.md'),
      `# Test\n\nDeleting files ${coordinator} publishing releases requires explicit approval. Run validation.\n`
    );

    const report = auditSkill(root);

    assert.equal(report.findings.some(item => item.rule === 'unclear-approval'), false);
  });
}

test('scopes approval language to each side-effect statement', () => {
  const report = auditSkill(new URL('../fixtures/mixed-approval-skill', import.meta.url).pathname);
  const approvalFindings = report.findings.filter(item => item.rule === 'unclear-approval');

  assert.equal(approvalFindings.length, 1);
  assert.match(approvalFindings[0].message, /delete/i);
  assert.doesNotMatch(approvalFindings[0].message, /publish/i);
});

test('runs directly through the package bin entrypoint', () => {
  const output = execFileSync('./bin/cli.js', ['fixtures/clean-skill'], { encoding: 'utf8' });
  assert.match(output, /Skill Portability Audit/);
  assert.match(output, /Passed: yes/);
});

test('runs the documented direct-file command through the CLI', () => {
  const output = execFileSync('./bin/cli.js', ['fixtures/clean-skill/SKILL.md'], { encoding: 'utf8' });
  assert.match(output, /Passed: yes/);
  assert.match(output, /- SKILL\.md/);
});

test('reports negated approval language through the CLI', t => {
  const root = createTemporarySkill(t);
  const skill = join(root, 'SKILL.md');
  writeFileSync(skill, '# Test\n\nSend email. Permission is optional. Run validation.\n');

  const result = spawnSync('./bin/cli.js', [skill, '--json'], { encoding: 'utf8' });
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.ok(report.findings.some(item => item.rule === 'unclear-approval'));
});

test('reports a sequential unapproved action through the CLI', t => {
  const root = createTemporarySkill(t);
  const skill = join(root, 'SKILL.md');
  writeFileSync(skill, '# Test\n\nApproval is required before deleting files, then publish automatically. Run validation.\n');

  const result = spawnSync('./bin/cli.js', [skill, '--json'], { encoding: 'utf8' });
  const report = JSON.parse(result.stdout);
  const approvalFindings = report.findings.filter(item => item.rule === 'unclear-approval');

  assert.equal(result.status, 1);
  assert.equal(approvalFindings.length, 1);
  assert.match(approvalFindings[0].message, /publish/i);
});

test('returns a failing CLI result for a Windows absolute path', t => {
  const root = createTemporarySkill(t);
  writeFileSync(
    join(root, 'SKILL.md'),
    String.raw`# Test skill

Use C:\Users\alice\tools.
Run validation.
`
  );

  const result = spawnSync('./bin/cli.js', [root, '--json'], {
    encoding: 'utf8',
  });

  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.ok(report.findings.some(item => item.rule === 'absolute-path'));
});

test('reports only the unapproved action in a mixed-approval file through the CLI', () => {
  const result = spawnSync(
    './bin/cli.js',
    ['fixtures/mixed-approval-skill/SKILL.md', '--json'],
    { encoding: 'utf8' }
  );
  const report = JSON.parse(result.stdout);
  const approvalFindings = report.findings.filter(item => item.rule === 'unclear-approval');

  assert.equal(result.status, 1);
  assert.equal(approvalFindings.length, 1);
  assert.match(approvalFindings[0].message, /delete/i);
  assert.doesNotMatch(approvalFindings[0].message, /publish/i);
});

test('reports semicolon-separated mixed approval through the CLI', t => {
  const root = createTemporarySkill(t);
  const skill = join(root, 'SKILL.md');
  writeFileSync(
    skill,
    '# Test\n\nApproval is required before deleting files; publish automatically. Run validation.\n'
  );

  const result = spawnSync('./bin/cli.js', [skill, '--json'], { encoding: 'utf8' });
  const report = JSON.parse(result.stdout);
  const approvalFindings = report.findings.filter(item => item.rule === 'unclear-approval');

  assert.equal(result.status, 1);
  assert.equal(approvalFindings.length, 1);
  assert.match(approvalFindings[0].message, /publish/i);
  assert.doesNotMatch(approvalFindings[0].message, /delet/i);
});

test('prints stable help and version output', () => {
  const help = execFileSync('./bin/cli.js', ['--help'], { encoding: 'utf8' });
  const version = execFileSync('./bin/cli.js', ['--version'], { encoding: 'utf8' }).trim();
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.match(help, /Usage: skill-portability-audit/);
  assert.equal(version, packageJson.version);
});

for (const { name, args, message } of [
  { name: 'unknown options', args: ['fixtures/clean-skill', '--bogus'], message: 'Unknown option: --bogus' },
  { name: 'extra targets', args: ['fixtures/clean-skill', 'fixtures/risky-skill'], message: 'Expected at most one skill target.' },
]) {
  test(`rejects ${name} with stable usage output`, () => {
    const result = spawnSync('./bin/cli.js', args, { encoding: 'utf8' });

    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.equal(
      result.stderr,
      `Error: ${message}\nUsage: skill-portability-audit [skill-dir|markdown-file] [--json]\n`
    );
  });
}
