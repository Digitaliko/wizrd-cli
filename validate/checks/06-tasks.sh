#!/bin/bash
# Check: tasks.md consistency — level-aware
#
# Post-Phase-2 of GitHub-as-backend migration:
#   - L0/L1: task tables eliminated repo-wide; tracking lives in GitHub Issues
#   - L2: project-specific, not our concern here
# A `tasks.md` containing task tables is now a bug to flag, not a requirement.

log_info "Checking tasks.md consistency (level: ${WIZRD_LEVEL:-auto})..."

# If a tasks.md exists at the repo root, warn — should be deleted post-Phase 2.
# (Narrative content belongs in CLAUDE.md / context.md / knowledge-base.)
if [ -f "tasks.md" ]; then
    # Allow if it's clearly narrative-only (no task-table markers like '- [ ]' or '## This Week')
    if grep -qE "^\s*- \[[ x]\]|^## This Week|^## Pipeline" tasks.md; then
        log_critical "tasks.md contains task tables — migrate to GitHub Issues (Phase 2 spec)"
    else
        log_warning "tasks.md exists — verify content is narrative-only (no task tables)"
    fi
else
    log_pass "No tasks.md (task tracking in GitHub Issues)"
fi
