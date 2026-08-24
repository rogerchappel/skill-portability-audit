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

The CLI accepts one target and the documented options only. Invalid options or
extra targets print an error plus usage to stderr and exit with status 2.
Missing, unreadable, or otherwise inaccessible targets print a concise error
without a stack trace and also exit with status 2. Audit findings exit with
status 1; a passing audit exits with status 0.

## Library

Import the public package API for automation. Pass either a skill directory or
the path to a Markdown file:

```js
import { auditSkill, renderMarkdown } from 'skill-portability-audit';

const report = auditSkill('fixtures/clean-skill/SKILL.md');
process.stdout.write(renderMarkdown(report));
```

## Safety Notes

This project is local-first and read-only. It prints plans or reports to stdout and does not call external services. Treat any generated mention of publishing, posting, deploying, sending, messaging, deleting, merging, charging, or emailing as requiring separate approval.

## Limitations

The heuristics are intentionally conservative. Approval words only satisfy the
side-effect check when they state an affirmative requirement in the same clause
as the action. One affirmative requirement can cover compound actions, but
approval for an action before “but,” “however,” “whereas,” or “while” does not
cover actions after that contrastive boundary. A semicolon also starts a new
approval scope, so approval before it does not cover actions after it. Comma-separated
sequential transitions (“then,” “next,” “afterwards,” “subsequently,” and “finally”)
also start a new scope, while explicitly coordinated actions joined by “and” or “or”
remain in one scope. Separate publish, post, deploy,
send, message, delete, merge, charge, or email statements and wording such as
“no approval is required” fail the audit. These statement and clause boundaries are text
heuristics rather than a full Markdown or natural-language parser. Explicit
prohibitions such as “does not publish” and “must not send” are not actionable
side effects. Machine-specific home-directory paths and host-local POSIX paths
under `/opt`, `/var`, `/etc`, `/srv`, `/private`, `/tmp`, `/Applications`, or
`/Volumes` fail the audit when they include one or more path components in prose.
For example, both `/tmp/project` and `/var/project/config.json` are findings.
URL and inline/fenced-code content is excluded from that check. Symbolic
links are skipped so a directory audit cannot leave the requested skill tree or
recurse through a link cycle. Review output before using it in an automated
workflow.

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
