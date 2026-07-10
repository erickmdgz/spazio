#!/usr/bin/env bash
# guard-branches.sh — PreToolUse (Bash) hook for Claude Code.
# Blocks direct `git commit` / `git push` to the protected branches main and develop.
# Designed to FAIL OPEN: on any doubt or error it allows the command
# (the hard guarantee is GitHub branch protection; this is a local layer).

# Read the event (JSON) that Claude Code sends via stdin.
input="$(cat 2>/dev/null || true)"

# We only care about git commands that commit or push.
if ! printf '%s' "$input" | grep -Eiq 'git[[:space:]].*(commit|push)'; then
  exit 0
fi

# Current branch of the repository.
dir="${CLAUDE_PROJECT_DIR:-.}"
branch="$(git -C "$dir" rev-parse --abbrev-ref HEAD 2>/dev/null)"

case "$branch" in
  main|develop)
    printf '%s\n' "BLOCKED by repo policy: direct commit/push to '$branch' is not allowed." >&2
    printf '%s\n' "Create a branch from 'develop' (feature/FEAT-XXX-... or fix/BUG-XXX-...) and open a Pull Request." >&2
    printf '%s\n' "See CLAUDE.md (Non-negotiable rules) and docs_en/11_implementation_flow.md." >&2
    exit 2
    ;;
  *)
    exit 0
    ;;
esac
