#!/bin/bash
# Check: Root governance files

log_info "Checking root files..."

# CLAUDE.md required at L0/L1 (wizrd convention), advisory at L2 (project varies)
if [ -f "CLAUDE.md" ]; then
    log_pass "CLAUDE.md exists"
else
    case "$WIZRD_LEVEL" in
        L0|L1) log_critical "Missing CLAUDE.md" ;;
        *)     log_warning  "Missing CLAUDE.md (advisory at L2)" ;;
    esac
fi

# Governance files — strict at L0 (company OS spine), advisory at L1/L2
case "$WIZRD_LEVEL" in
    L0)
        AI_AGENTS_SEVERITY=warning
        HOWTO_SEVERITY=warning
        CONSTITUTION_SEVERITY=critical
        ;;
    *)
        AI_AGENTS_SEVERITY=info
        HOWTO_SEVERITY=info
        CONSTITUTION_SEVERITY=info
        ;;
esac

for spec in "AI-AGENTS.md:$AI_AGENTS_SEVERITY" "HOW-TO.md:$HOWTO_SEVERITY" "CONSTITUTION.md:$CONSTITUTION_SEVERITY"; do
    file="${spec%%:*}"
    sev="${spec##*:}"
    if [ -f "$file" ]; then
        log_pass "$file exists"
    else
        case "$sev" in
            critical) log_critical "Missing $file" ;;
            warning)  log_warning  "Missing $file" ;;
            info)     log_info     "Missing $file (advisory at this level)" ;;
        esac
    fi
done

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
