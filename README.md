# skill-portability-audit

Audit agent skills for portability, approvals, and local-machine assumptions.

## Quickstart

```bash
npm test
npm run smoke
```

## CLI

```bash
node bin/cli.js fixtures/clean-skill/SKILL.md
node bin/cli.js fixtures/clean-skill/SKILL.md --json
```

## Library

Import from `src/index.js` for local automation and tests.

## Safety Notes

This project is local-first and read-only. It prints plans or reports to stdout and does not call external services. Treat any generated mention of publishing, deploying, messaging, deleting, or merging as requiring separate approval.

## Limitations

The heuristics are intentionally conservative. Review output before using it in an automated workflow.
