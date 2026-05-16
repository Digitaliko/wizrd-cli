#!/bin/bash
# Check: Context budget — total lines of always-loaded context
# Claude Code loads CLAUDE.md + all .claude/rules/*.md on every conversation start.
# If this grows too large, it wastes context window and slows response.
# Budget: 800 lines max (warning at 600).

log_info "Checking context budget..."

total_lines=0

# CLAUDE.md
if [ -f "CLAUDE.md" ]; then
    claude_lines=$(wc -l < CLAUDE.md | tr -d ' ')
    total_lines=$((total_lines + claude_lines))
    log_info "CLAUDE.md: $claude_lines lines"
fi

# .claude/rules/*.md
if [ -d ".claude/rules" ]; then
    for rule_file in .claude/rules/*.md; do
        [ -f "$rule_file" ] || continue
        rule_name=$(basename "$rule_file")
        rule_lines=$(wc -l < "$rule_file" | tr -d ' ')
        total_lines=$((total_lines + rule_lines))
        log_info "rules/$rule_name: $rule_lines lines"
    done
fi

log_info "Total always-loaded context: $total_lines lines"

if [ "$total_lines" -gt 800 ]; then
    log_critical "Context budget exceeded: $total_lines lines (max 800). Move content to knowledge-base/ or skills."
elif [ "$total_lines" -gt 600 ]; then
    log_warning "Context budget high: $total_lines lines (warning at 600, max 800)"
else
    log_pass "Context budget OK: $total_lines lines (max 800)"
fi
