#!/bin/bash
# Check: Harness adoption — every wizrd repo references the shared wizrd-cli composite actions.
#
# Closes the loop: if a repo drops or rewrites its harness workflows, validate catches it.
# This makes the deterministic CI harness itself deterministic.
#
# Level rules:
#   L0/L1 — all three workflow files required (validate, code-review, wizrd-agent)
#   L2    — advisory (project-specific CI varies; we still encourage the shared actions)

log_info "Checking harness adoption (wizrd-cli@v1 composite actions)..."

WORKFLOW_DIR=".github/workflows"

# Required composite-action references — must appear somewhere in the workflows.
EXPECTED=(
    "Digitaliko/wizrd-cli/.github/actions/validate@v1"
    "Digitaliko/wizrd-cli/.github/actions/code-review@v1"
    "Digitaliko/wizrd-cli/.github/actions/wizrd-agent@v1"
)

if [ ! -d "$WORKFLOW_DIR" ]; then
    case "$WIZRD_LEVEL" in
        L0|L1) log_critical "Missing $WORKFLOW_DIR — wizrd repos must reference wizrd-cli composite actions" ;;
        *)     log_info     "No $WORKFLOW_DIR (advisory at L2)" ;;
    esac
    return 0 2>/dev/null || exit 0
fi

# Severity per level: L0/L1 strict, L2 advisory.
case "$WIZRD_LEVEL" in
    L0|L1) MISSING_SEVERITY=critical ;;
    *)     MISSING_SEVERITY=info ;;
esac

for ref in "${EXPECTED[@]}"; do
    short=$(echo "$ref" | sed 's|Digitaliko/wizrd-cli/.github/actions/||;s|@v1||')
    if grep -rq "$ref" "$WORKFLOW_DIR" 2>/dev/null; then
        log_pass "Harness action referenced: $short"
    else
        case "$MISSING_SEVERITY" in
            critical) log_critical "Missing harness action: $short — add a workflow that uses $ref" ;;
            *)        log_info     "No harness action: $short (advisory at L2)" ;;
        esac
    fi
done

# Warn on stale duplicates we sweep away
for stale in "claude-code-review.yml" "claude.yml" "validate-repo.yml"; do
    if [ -f "$WORKFLOW_DIR/$stale" ]; then
        log_warning "Stale workflow file: $WORKFLOW_DIR/$stale — superseded by wizrd-cli harness, delete it"
    fi
done
