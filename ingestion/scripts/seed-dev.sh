#!/usr/bin/env bash
# Load the mock disease risks into the dev MongoDB.
#
# Runs mongosh in a throwaway container on the shared `apha-risk` network,
# so it reaches the dev `mongodb` service. Start the dev stack first
# (`npm run docker:up:d`) so the API has applied the collection validator.
#
# Usage: ingestion/scripts/seed-dev.sh [data file, relative to the repo root]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DATA_FILE="${1:-test/mocks/disease-risks.json}"
MONGO_IMAGE="${MONGO_IMAGE:-mongo:7.0.28}"
MONGO_URI="${MONGO_URI:-mongodb://mongodb:27017/apha-risk-insights-backend}"

if [[ ! -f "${REPO_ROOT}/${DATA_FILE}" ]]; then
  echo "Error: Data file not found: ${DATA_FILE}" >&2
  exit 1
fi

docker run --rm \
  --network apha-risk \
  --volume "${REPO_ROOT}:/repo:ro" \
  --env "DATA_FILE=/repo/${DATA_FILE}" \
  "${MONGO_IMAGE}" \
  mongosh "${MONGO_URI}" --quiet --file /repo/ingestion/scripts/load-disease-risks.js
