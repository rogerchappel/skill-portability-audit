# skill-portability-audit

Audit agent skills for portability, approvals, and local-machine assumptions.

## Quickstart

```bash
npm install
npm run release:check
```

## CLI

```bash
node bin/cli.js fixtures/clean-skill/SKILL.md
node bin/cli.js fixtures/clean-skill/SKILL.md --json
skill-portability-audit --help
skill-portability-audit --version
```

## Library

Import `auditSkill` from `src/index.js` for local automation and tests. Pass either
a skill directory or the path to a Markdown file:

```js
import { auditSkill } from './src/index.js';

const report = auditSkill('fixtures/clean-skill/SKILL.md');
```

## Safety Notes

This project is local-first and read-only. It prints plans or reports to stdout and does not call external services. Treat any generated mention of publishing, deploying, messaging, deleting, or merging as requiring separate approval.

## Limitations

The heuristics are intentionally conservative. Approval words only satisfy the
side-effect check when they state an affirmative requirement; wording such as
“no approval is required” remains a warning. Symbolic links are skipped so a
directory audit cannot leave the requested skill tree or recurse through a link
cycle. Review output before using it in an automated workflow.

## Local Verification

```sh
npm run check
npm test
npm run smoke
npm run package:smoke
npm run release:check
```

## Verification

```sh
npm test
npm run check --if-present
npm run smoke --if-present
```
