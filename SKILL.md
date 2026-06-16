# skill-portability-audit

## When to Use

Use this skill before publishing or sharing an agent skill. It reads local Markdown files in the target skill directory and reports portability or approval risks. It does not modify files, install dependencies, or contact external services. External writes remain outside scope. Validate with JSON output in automation or Markdown output for review comments.

## Required Inputs

Local files supplied by the user or repository fixtures.

## Side Effects

Read-only. The CLI writes results to stdout only.

## Validation

Run `npm test`, `npm run check`, and `npm run smoke`.
