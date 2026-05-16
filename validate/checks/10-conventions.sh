#!/bin/bash
# Check: Wizrd system conventions

log_info "Checking wizrd conventions..."

# Wizrd Level declared
if [ -n "$WIZRD_LEVEL" ]; then
    log_pass "Wizrd Level declared: $WIZRD_LEVEL"
else
    log_warning "No Wizrd Level declared in CLAUDE.md"
fi

# L1+ should reference inherited conventions
if [[ "$WIZRD_LEVEL" =~ ^L[1-9] ]]; then
    if grep -q "Inherited" CLAUDE.md 2>/dev/null; then
        log_pass "L1+ CLAUDE.md references inherited conventions"
    else
        log_warning "L1+ CLAUDE.md should reference inherited conventions"
    fi
fi

# No archive directories should exist (cleanup policy: delete, don't archive)
if [ -d ".claude/skills/archive" ]; then
    log_warning "skills/archive/ directory exists — policy is to delete, not archive"
fi

if [ -d ".claude/agents/archive" ]; then
    log_warning "agents/archive/ directory exists — policy is to delete, not archive"
fi
