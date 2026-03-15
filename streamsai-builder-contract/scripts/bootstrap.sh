#!/usr/bin/env bash
set -euo pipefail
pnpm install
pnpm verify-env
pnpm migrate
pnpm seed:knowledge
pnpm reindex:knowledge
