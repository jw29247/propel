#!/usr/bin/env bash
set -euo pipefail

cd /repo

export PROPEL_STATE_DIR="/tmp/propel-test"
export PROPEL_CONFIG_PATH="${PROPEL_STATE_DIR}/propel.json"

echo "==> Build"
pnpm build

echo "==> Seed state"
mkdir -p "${PROPEL_STATE_DIR}/credentials"
mkdir -p "${PROPEL_STATE_DIR}/agents/main/sessions"
echo '{}' >"${PROPEL_CONFIG_PATH}"
echo 'creds' >"${PROPEL_STATE_DIR}/credentials/marker.txt"
echo 'session' >"${PROPEL_STATE_DIR}/agents/main/sessions/sessions.json"

echo "==> Reset (config+creds+sessions)"
pnpm propel reset --scope config+creds+sessions --yes --non-interactive

test ! -f "${PROPEL_CONFIG_PATH}"
test ! -d "${PROPEL_STATE_DIR}/credentials"
test ! -d "${PROPEL_STATE_DIR}/agents/main/sessions"

echo "==> Recreate minimal config"
mkdir -p "${PROPEL_STATE_DIR}/credentials"
echo '{}' >"${PROPEL_CONFIG_PATH}"

echo "==> Uninstall (state only)"
pnpm propel uninstall --state --yes --non-interactive

test ! -d "${PROPEL_STATE_DIR}"

echo "OK"
