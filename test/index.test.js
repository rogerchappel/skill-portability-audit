import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
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

test('prints stable help and version output', () => {
  const help = execFileSync('./bin/cli.js', ['--help'], { encoding: 'utf8' });
  const version = execFileSync('./bin/cli.js', ['--version'], { encoding: 'utf8' }).trim();
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.match(help, /Usage: skill-portability-audit/);
  assert.equal(version, packageJson.version);
});
