#!/usr/bin/env bash
# Seed standardized labels on a GitHub repo for the wizrd OS.
# Usage: tools/seed-labels.sh <L0|L1|L2> <owner/repo>

set -euo pipefail

LEVEL="${1:-}"
REPO="${2:-}"

if [[ -z "$LEVEL" || -z "$REPO" ]]; then
  echo "Usage: $0 <L0|L1|L2> <owner/repo>" >&2
  exit 1
fi

upsert() {
  local name="$1" color="$2" desc="$3"
  if gh label list --repo "$REPO" --json name --jq '.[].name' | grep -qx "$name"; then
    gh label edit "$name" --repo "$REPO" --color "$color" --description "$desc" >/dev/null
    echo "  updated: $name"
  else
    gh label create "$name" --repo "$REPO" --color "$color" --description "$desc" >/dev/null
    echo "  created: $name"
  fi
}

echo "Seeding $LEVEL labels on $REPO..."

# Priority — all repos
upsert "p0"          "b60205" "drop everything"
upsert "p1"          "d93f0b" "this week"
upsert "p2"          "fbca04" "this sprint"
upsert "p3"          "c5def5" "backlog"

# Status — all repos
upsert "in-progress" "0e8a16" "actively being worked"
upsert "blocked"     "5319e7" "cannot progress"
upsert "review"      "1d76db" "done, awaiting review/sign-off"

# Special by level
case "$LEVEL" in
  L0)
    upsert "decision" "a371f7" "needs Filip's call"
    upsert "internal" "000000" "L0 only — hidden from non-Filip views"
    ;;
  L1)
    upsert "decision" "a371f7" "needs Filip's call"
    ;;
  L2)
    upsert "bug"      "d73a4a" "something is broken"
    upsert "feature"  "0e8a16" "new capability"
    ;;
esac

echo "Done."
