#!/bin/bash
# Check: Root governance files

log_info "Checking root files..."

if [ -f "CLAUDE.md" ]; then
    log_pass "CLAUDE.md exists"
else
    log_critical "Missing CLAUDE.md"
fi

if [ -f "AI-AGENTS.md" ]; then
    log_pass "AI-AGENTS.md exists"
else
    log_warning "Missing AI-AGENTS.md"
fi

if [ -f "HOW-TO.md" ]; then
    log_pass "HOW-TO.md exists"
else
    log_warning "Missing HOW-TO.md"
fi

if [ -f "CONSTITUTION.md" ]; then
    log_pass "CONSTITUTION.md exists"
else
    log_critical "Missing CONSTITUTION.md"
fi

# Root hygiene — no stale media or planning docs
for file in *.jpeg *.png *.jpg; do
    if [ -f "$file" ]; then
        log_warning "Stale media file at root: $file"
    fi
done

for file in ACTION-ITEMS-*.md *-TASKS.md *-PLAN.md; do
    if [ -f "$file" ]; then
        log_warning "Stale planning doc at root: $file"
    fi
done
