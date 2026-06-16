#!/usr/bin/env bash
set -euo pipefail
npm test
npm run check
npm run smoke >/tmp/skill-portability-audit-smoke.md
test -s /tmp/skill-portability-audit-smoke.md
