#!/usr/bin/env bash
# Check 12: pipeline adoption
# If the repo has .github/workflows/wizrd-pipeline.yml, validate it:
#   - References Digitaliko/wizrd-cli/.github/workflows/wizrd-stage-*.yml@v1
#   - The pipeline labels exist on the repo (when REPO env is set)

PIPELINE_FILE=".github/workflows/wizrd-pipeline.yml"

if [ ! -f "$PIPELINE_FILE" ]; then
  log_info "12-pipeline: no $PIPELINE_FILE — skipping (repo not in pipeline)"
  return 0
fi

# 1. Must reference at least one wizrd-stage-*.yml@v1
if ! grep -qE 'Digitaliko/wizrd-cli/\.github/workflows/wizrd-stage-[a-z-]+\.yml@v1' "$PIPELINE_FILE"; then
  log_critical "12-pipeline: $PIPELINE_FILE exists but does not reference any wizrd-stage-*.yml@v1 composite"
  return 0
fi

# 2. Should reference the tagger (warning only)
if ! grep -qE 'Digitaliko/wizrd-cli/\.github/workflows/wizrd-tagger\.yml@v1' "$PIPELINE_FILE"; then
  log_warning "12-pipeline: $PIPELINE_FILE does not reference wizrd-tagger.yml@v1 — issues will not auto-pick up"
fi

# 3. If REPO env is set, check labels exist
if [ -n "${REPO:-}" ]; then
  required=(wizrd:triage wizrd:plan wizrd:implement wizrd:review wizrd:verify wizrd:awaiting-approval wizrd:needs-judgment)
  if ! command -v gh >/dev/null 2>&1; then
    log_warning "12-pipeline: gh CLI not available — skipping label check on $REPO"
    return 0
  fi
  existing=$(gh label list --repo "$REPO" --limit 200 --json name --jq '.[].name' 2>/dev/null || echo "")
  if [ -z "$existing" ]; then
    log_warning "12-pipeline: could not list labels on $REPO — skipping label check"
    return 0
  fi
  missing=()
  for label in "${required[@]}"; do
    if ! printf '%s\n' "$existing" | grep -qx "$label"; then
      missing+=("$label")
    fi
  done
  if [ "${#missing[@]}" -gt 0 ]; then
    log_critical "12-pipeline: $REPO is missing required pipeline labels: ${missing[*]}"
    log_info "  fix: ./seed-labels.sh L2 $REPO"
    return 0
  fi
fi

log_pass "12-pipeline: pipeline workflow references valid composites"
