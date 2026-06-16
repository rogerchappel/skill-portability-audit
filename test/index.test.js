import test from 'node:test';
import assert from 'node:assert/strict';
import { auditSkill } from '../src/index.js';

test('passes a portable skill fixture', () => {
  const report = auditSkill(new URL('../fixtures/clean-skill', import.meta.url).pathname);
  assert.equal(report.passed, true);
  assert.equal(report.findings.length, 0);
});

test('flags missing skill file and absolute paths', () => {
  const report = auditSkill(new URL('../fixtures/risky-skill', import.meta.url).pathname);
  assert.equal(report.passed, false);
  assert.ok(report.findings.some(item => item.rule === 'missing-skill'));
  assert.ok(report.findings.some(item => item.rule === 'absolute-path'));
});
