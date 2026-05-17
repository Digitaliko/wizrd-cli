#!/bin/bash
# Check: Directory structure

log_info "Checking directory structure..."

# Required vs advisory dirs per level.
# L0: strict (the company OS needs all top-level dirs).
# L1: light — wizrds are doc-heavy, may or may not have services/skills.
# L2: project-specific, no shared structure requirement.
case "$WIZRD_LEVEL" in
    L0)
        REQUIRED_DIRS=(".claude/agents" ".claude/skills" "clients" "knowledge-base" "services")
        ADVISORY_DIRS=()
        ;;
    L1)
        REQUIRED_DIRS=()
        ADVISORY_DIRS=(".claude/skills" "services" "knowledge-base")
        ;;
    L2|*)
        REQUIRED_DIRS=()
        ADVISORY_DIRS=()
        ;;
esac

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        log_pass "Directory exists: $dir"
    else
        log_critical "Missing required directory: $dir"
    fi
done

for dir in "${ADVISORY_DIRS[@]}"; do
    [ -d "$dir" ] && log_pass "Directory exists: $dir" || log_warning "Missing conventional directory: $dir (advisory)"
done

# Root directory hygiene (L0 only)
if [ "$WIZRD_LEVEL" = "L0" ]; then
    ALLOWED_ROOT_DIRS=(".claude" ".git" ".github" "archive" "brand" "clients" "company" "content" "knowledge-base" "operations" "services" "tools")

    for dir in */; do
        dir_name="${dir%/}"
        is_allowed=false
        for allowed in "${ALLOWED_ROOT_DIRS[@]}"; do
            if [ "$dir_name" = "$allowed" ]; then
                is_allowed=true
                break
            fi
        done
        if [ "$is_allowed" = false ]; then
            log_warning "Unexpected root directory: $dir_name"
        fi
    done
fi
