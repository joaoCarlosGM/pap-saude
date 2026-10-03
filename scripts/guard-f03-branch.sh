#!/usr/bin/env bash
set -Eeuo pipefail

BRANCH="$(git branch --show-current)"

if [[ -z "$BRANCH" ]]; then
  printf 'SAFETY FAILURE: detached HEAD\n'
  exit 1
fi

case "$BRANCH" in
  develop|main|master|prod|production)
    printf 'SAFETY FAILURE: protected branch %s\n' "$BRANCH"
    exit 1
    ;;
esac

case "$BRANCH" in
  feature/foundation-03-*)
    printf 'PASS  safe F03 branch: %s\n' "$BRANCH"
    ;;
  *)
    printf 'SAFETY FAILURE: expected feature/foundation-03-*, got %s\n' "$BRANCH"
    exit 1
    ;;
esac
