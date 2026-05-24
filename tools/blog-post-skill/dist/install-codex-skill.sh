#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
TARGET_DIR="${HOME}/.codex/skills/blog-post-publisher"

mkdir -p "${TARGET_DIR}"
rsync -a --delete "${REPO_ROOT}/.codex/skills/blog-post-publisher/" "${TARGET_DIR}/"

echo "Installed Codex skill to ${TARGET_DIR}"
