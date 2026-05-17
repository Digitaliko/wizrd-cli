#!/bin/bash
# Check: tasks.md consistency (root + client)

log_info "Checking tasks.md consistency..."

if [ -f "tasks.md" ]; then
    log_pass "Root tasks.md exists"

    grep -q "## Goals" tasks.md && log_pass "tasks.md has Goals section" || log_warning "tasks.md missing ## Goals"
    grep -q "## Revenue" tasks.md && log_pass "tasks.md has Revenue section" || log_warning "tasks.md missing ## Revenue"
    grep -q "## This Week" tasks.md && log_pass "tasks.md has This Week section" || log_warning "tasks.md missing ## This Week"
    grep -q "## Pipeline" tasks.md && log_pass "tasks.md has Pipeline section" || log_warning "tasks.md missing ## Pipeline"

    # Staleness check
    last_updated=$(grep -o 'Last Updated.*:.*20[0-9][0-9]-[0-9][0-9]-[0-9][0-9]' tasks.md | head -1 | grep -o '20[0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
    if [ -n "$last_updated" ]; then
        last_ts=$(date -j -f "%Y-%m-%d" "$last_updated" "+%s" 2>/dev/null) || last_ts=$(date -d "$last_updated" "+%s" 2>/dev/null) || last_ts=""
        if [ -n "$last_ts" ]; then
            now=$(date +%s)
            days_old=$(( (now - last_ts) / 86400 ))
            if [ "$days_old" -gt 14 ]; then
                log_warning "Root tasks.md Last Updated is $days_old days old ($last_updated)"
            else
                log_pass "Root tasks.md is recent ($last_updated)"
            fi
        fi
    else
        log_warning "Root tasks.md missing Last Updated date"
    fi
elif [ -f ".claude/rules/github-issues.md" ]; then
    log_pass "Root tasks.md migrated to GitHub Issues (.claude/rules/github-issues.md present)"
else
    log_critical "Missing root tasks.md"
fi
