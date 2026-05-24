#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <target-project-root>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
TARGET_ROOT="$(cd "$1" && pwd)"

mkdir -p "${TARGET_ROOT}/.claude/commands"
cp "${REPO_ROOT}/.claude/commands/blog-post.md" "${TARGET_ROOT}/.claude/commands/blog-post.md"

echo "Installed Claude command to ${TARGET_ROOT}/.claude/commands/blog-post.md"
