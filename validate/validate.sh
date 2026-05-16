#!/bin/bash
# Wizrd Repository Validator — Modular Check System
# The deterministic layer for the company OS.
# Like ESLint/tests for code, but for skills, agents, clients, and conventions.
#
# Usage (when installed in ~/.wizrd-cli):
#   bash ~/.wizrd-cli/validate/validate.sh           # Run all checks against $PWD
#   bash ~/.wizrd-cli/validate/validate.sh --check 04  # Run only matching checks
#   bash ~/.wizrd-cli/validate/validate.sh --ci      # CI mode (no colors)
#
# Repo root resolution:
#   1. $WIZRD_REPO_ROOT (if set)
#   2. $PWD (default — call from inside the repo you want to validate)
#
# Exit codes: 0 = pass, 1 = warnings, 2 = critical errors
#
# Adding new checks:
#   1. Create validate/checks/NN-name.sh
#   2. Use log_critical/log_warning/log_pass/log_info from helpers.sh
#   3. The runner sources all checks in order automatically

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${WIZRD_REPO_ROOT:-$PWD}"

# Parse args
CI_MODE=false
CHECK_FILTER=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --ci)
            CI_MODE=true
            shift
            ;;
        --check)
            CHECK_FILTER="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# CI mode: strip colors
if [ "$CI_MODE" = true ]; then
    export NO_COLOR=1
fi

# Change to repo root
cd "$REPO_ROOT"

# Load helpers
source "$SCRIPT_DIR/lib/helpers.sh"

# Override colors in CI mode
if [ "$CI_MODE" = true ]; then
    RED=''
    YELLOW=''
    GREEN=''
    BLUE=''
    NC=''
fi

echo ""
echo "=========================================="
echo "  WIZRD REPOSITORY VALIDATION"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""

# Detect level (available to all checks as $WIZRD_LEVEL)
# Allow override via WIZRD_LEVEL env var (composite action input).
if [ -z "${WIZRD_LEVEL:-}" ]; then
    WIZRD_LEVEL=$(detect_level)
fi
if [ -n "$WIZRD_LEVEL" ]; then
    log_info "Detected Wizrd Level: $WIZRD_LEVEL"
else
    log_info "No Wizrd Level declared"
fi

# Run checks
for check_file in "$SCRIPT_DIR"/checks/*.sh; do
    [ -f "$check_file" ] || continue

    check_name=$(basename "$check_file" .sh)

    # Filter if --check specified
    if [ -n "$CHECK_FILTER" ] && [[ ! "$check_name" == "$CHECK_FILTER"* ]]; then
        continue
    fi

    echo ""
    source "$check_file"
done

# Report
echo ""
echo "=========================================="
echo "  VALIDATION SUMMARY"
echo "=========================================="
echo ""
echo -e "  ${GREEN}Passed:${NC}    $PASSED"
echo -e "  ${YELLOW}Warnings:${NC}  $WARNINGS"
echo -e "  ${RED}Critical:${NC}  $CRITICAL"
echo ""

if [ $CRITICAL -gt 0 ]; then
    echo -e "${RED}VALIDATION FAILED${NC} — $CRITICAL critical issues"
    exit 2
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}VALIDATION PASSED WITH WARNINGS${NC}"
    exit 1
else
    echo -e "${GREEN}VALIDATION PASSED${NC}"
    exit 0
fi
