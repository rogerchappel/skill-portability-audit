# Changelog

## Unreleased

- Exclude harmless hyphenated `post-` compounds from approval findings while
  retaining detection of post action verb forms.
- Associate forward approval requirements with the actions they govern instead
  of suppressing unrelated earlier side effects in the same clause.

- Recognize remove and overwrite verb forms as approval-sensitive destructive actions.

- Distinguish explicit side-effect prohibitions from actionable operations while
  retaining affirmative same-clause approval enforcement.
- Detect host-local POSIX paths in prose without flagging URL or code examples.
- Report inaccessible CLI targets concisely with documented input-error status.
- Treat semicolons as approval-scope boundaries so approval for an earlier
  action cannot implicitly authorize a later action.
- Detect posting and messaging as external side effects that require affirmative
  approval in the same clause.
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
