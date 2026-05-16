#!/bin/bash
# Check: Stale references + cross-reference integrity
# Catches archived/deleted skills still referenced in active docs.
# Only checks explicit skill invocations: /w-name, `w-name`, "w-name" patterns.

log_info "Checking reference integrity..."

# --- Build inventory of what actually exists ---

ACTIVE_SKILLS=()
if [ -d ".claude/skills" ]; then
    for skill_dir in .claude/skills/*/; do
        [ -d "$skill_dir" ] || continue
        sname=$(basename "$skill_dir")
        [ "$sname" = "archive" ] && continue
        ACTIVE_SKILLS+=("$sname")
    done
fi

ACTIVE_AGENTS=()
if [ -d ".claude/agents" ]; then
    for agent_file in .claude/agents/*.md; do
        [ -f "$agent_file" ] || continue
        aname=$(basename "$agent_file" .md)
        [ "$aname" = "_template" ] && continue
        ACTIVE_AGENTS+=("$aname")
    done
fi

log_info "Active skills: ${#ACTIVE_SKILLS[@]}, Active agents: ${#ACTIVE_AGENTS[@]}"

# --- Stale skill references ---
# Only match explicit skill invocation patterns:
#   /w-name (slash command)
#   `w-name` (backtick reference)
# This avoids false positives from prose like "how-to-write" or URLs

SCAN_PATHS=("CLAUDE.md" "AI-AGENTS.md" "HOW-TO.md" "ARCHITECTURE.md" "CONSTITUTION.md")
SCAN_DIRS=(".claude/rules" ".claude/agents" ".claude/skills" "knowledge-base/quality-gates.md" "knowledge-base/team" "knowledge-base/sales" "knowledge-base/playbooks" "knowledge-base/processes" "knowledge-base/integrations")

# Build file list
SCAN_FILES=()
for p in "${SCAN_PATHS[@]}"; do
    [ -f "$p" ] && SCAN_FILES+=("$p")
done
for d in "${SCAN_DIRS[@]}"; do
    if [ -d "$d" ]; then
        while IFS= read -r f; do
            SCAN_FILES+=("$f")
        done < <(find "$d" -name "*.md" -not -path "*/archive/*" 2>/dev/null)
    elif [ -f "$d" ]; then
        SCAN_FILES+=("$d")
    fi
done

stale_found=0

if [ ${#SCAN_FILES[@]} -gt 0 ] && [ ${#ACTIVE_SKILLS[@]} -gt 0 ]; then
    # Extract skill references: /w-name or `w-name` patterns
    all_refs=$(grep -ohE '(/w-[a-z][-a-z0-9]+|`w-[a-z][-a-z0-9]+`)' "${SCAN_FILES[@]}" 2>/dev/null | \
        sed 's|^/||; s|`||g' | sort -u)

    for ref in $all_refs; do
        is_active=false

        # Direct match
        for skill in "${ACTIVE_SKILLS[@]}"; do
            if [ "$ref" = "$skill" ]; then
                is_active=true
                break
            fi
        done

        # Companion sub-command match (w-prospect-bulk → w-prospect + BULK.md)
        if [ "$is_active" = false ]; then
            for skill in "${ACTIVE_SKILLS[@]}"; do
                if [[ "$ref" == "${skill}-"* ]]; then
                    suffix=$(echo "$ref" | sed "s/^${skill}-//")
                    suffix_upper=$(echo "$suffix" | tr '[:lower:]' '[:upper:]')
                    if [ -f ".claude/skills/${skill}/${suffix_upper}.md" ]; then
                        is_active=true
                        break
                    fi
                fi
            done
        fi

        if [ "$is_active" = false ]; then
            offending_files=$(grep -rlE "(/|\`)${ref}(\`|[^a-z0-9-])" "${SCAN_FILES[@]}" 2>/dev/null | head -3)
            if [ -n "$offending_files" ]; then
                file_list=$(echo "$offending_files" | tr '\n' ', ' | sed 's/,$//')
                log_critical "Stale skill reference '$ref' in: $file_list"
                stale_found=$((stale_found+1))
            fi
        fi
    done
fi

if [ "$stale_found" -eq 0 ]; then
    log_pass "No stale skill references found"
fi

# --- Cross-reference: CLAUDE.md skill list vs actual files ---
if [ -f "CLAUDE.md" ] && [ "$WIZRD_LEVEL" = "L0" ]; then
    log_info "Cross-referencing CLAUDE.md skill list with files..."

    # Skills mentioned in CLAUDE.md
    claude_skills=$(grep -oE '`?w-[a-z][-a-z0-9]+`?' CLAUDE.md | sed 's/`//g' | sort -u)

    for skill in $claude_skills; do
        if [ ! -d ".claude/skills/$skill" ]; then
            # Check if it's a companion sub-command
            base=$(echo "$skill" | sed -E 's/-[a-z]+$//')
            if [ ! -d ".claude/skills/$base" ] || [ "$base" = "$skill" ]; then
                log_warning "CLAUDE.md references '$skill' but .claude/skills/$skill/ does not exist"
            fi
        fi
    done

    # Reverse: skill dirs not in CLAUDE.md
    for skill in "${ACTIVE_SKILLS[@]}"; do
        if ! grep -q "$skill" CLAUDE.md 2>/dev/null; then
            log_warning "Skill '$skill' exists but not listed in CLAUDE.md"
        fi
    done

    log_pass "Cross-reference check complete"
fi
