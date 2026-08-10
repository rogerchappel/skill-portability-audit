# Changelog

## Unreleased

- Associate approval requirements with each side-effect action across
  contrastive clauses, and fail audits when an action lacks approval.
- Reject unknown CLI options and extra target arguments with stable usage
  output.
- Expose `auditSkill` and `renderMarkdown` through the installed package entry
  point.
- Detect conventional Windows user paths written with backslashes or forward
  slashes.
- Verify the packed library API and CLI from an isolated installation during
  release checks.
- Skip symbolic links during Markdown discovery to prevent traversal outside the skill root and symlink cycles.

## 0.1.0

- Initial release-candidate build with CLI, fixtures, tests, docs, and skill instructions.
