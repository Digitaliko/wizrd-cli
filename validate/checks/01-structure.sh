#!/bin/bash
# Check: Directory structure

log_info "Checking directory structure..."

case "$WIZRD_LEVEL" in
    L0)
        REQUIRED_DIRS=(".claude/agents" ".claude/skills" "clients" "knowledge-base" "services")
        ;;
    L1)
        REQUIRED_DIRS=(".claude/skills" "services" "knowledge-base")
        ;;
    L2)
        REQUIRED_DIRS=()
        ;;
    *)
        REQUIRED_DIRS=(".claude/agents" ".claude/skills" "clients" "knowledge-base" "services")
        ;;
esac

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        log_pass "Directory exists: $dir"
    else
        log_critical "Missing required directory: $dir"
    fi
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
