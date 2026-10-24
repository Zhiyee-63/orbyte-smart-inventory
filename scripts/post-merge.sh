#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

npm ci --prefix backend --no-audit --no-fund
npm ci --prefix frontend --no-audit --no-fund
npm run build --prefix frontend
node --check backend/server.js
