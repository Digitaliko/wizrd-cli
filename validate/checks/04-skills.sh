#!/bin/bash
# Check: Skill quality — harness methodology enforcement
# Every skill MUST have: frontmatter, Playbook, Quality Gate, Decision Authority, Guardrails
# This is the deterministic layer that controls LLM skill quality.

log_info "Validating skills..."

if [ ! -d ".claude/skills" ]; then
    return 0 2>/dev/null || exit 0
fi

SKILL_COUNT=0
SKILL_NAMES=()

for skill_dir in .claude/skills/*/; do
    [ -d "$skill_dir" ] || continue
    skill_name=$(basename "$skill_dir")

    # Skip archive (shouldn't exist after cleanup, but guard anyway)
    [ "$skill_name" = "archive" ] && continue

    skill_file="${skill_dir}SKILL.md"

    if [ ! -f "$skill_file" ]; then
        log_critical "Skill '$skill_name' missing SKILL.md"
        continue
    fi

    SKILL_COUNT=$((SKILL_COUNT+1))
    SKILL_NAMES+=("$skill_name")

    # --- Frontmatter ---
    if ! has_frontmatter "$skill_file"; then
        log_critical "Skill '$skill_name' missing YAML frontmatter"
        continue
    fi

    name=$(get_frontmatter_field "$skill_file" "name")
    description=$(get_frontmatter_field "$skill_file" "description")

    [ -z "$name" ] && log_critical "Skill '$skill_name' missing 'name' in frontmatter"
    [ -z "$description" ] && log_critical "Skill '$skill_name' missing 'description' in frontmatter"

    # Description should contain trigger keywords
    if [ -n "$description" ]; then
        desc_len=${#description}
        if [ "$desc_len" -lt 50 ]; then
            log_warning "Skill '$skill_name' description too short ($desc_len chars) — needs trigger keywords"
        fi
    fi

    # --- Required sections (harness methodology) ---

    # Playbook: WHY the skill exists
    if ! has_section "$skill_file" "Playbook"; then
        log_critical "Skill '$skill_name' missing ## Playbook section (WHY the skill exists)"
    fi

    # Quality Gate: deterministic checks before skill reports done
    if ! has_section "$skill_file" "Quality Gate"; then
        log_critical "Skill '$skill_name' missing ## Quality Gate section"
    else
        # Quality gate should have L1/L2/L3 tiers
        if ! grep -q "### L1" "$skill_file"; then
            log_warning "Skill '$skill_name' Quality Gate missing ### L1 (auto-block) tier"
        fi
        if ! grep -q "### L2" "$skill_file"; then
            log_warning "Skill '$skill_name' Quality Gate missing ### L2 (human-review) tier"
        fi
    fi

    # Decision Authority: what can auto-execute vs needs approval
    if ! has_section "$skill_file" "Decision Authority"; then
        log_warning "Skill '$skill_name' missing ## Decision Authority section"
    fi

    # Guardrails: Do/Don't/Escalate
    if ! has_section "$skill_file" "Guardrails" && ! grep -q "^## Guardrails" "$skill_file"; then
        # Some skills use "Guardrails" as part of another section name
        if ! grep -q "Guardrails" "$skill_file"; then
            log_warning "Skill '$skill_name' missing ## Guardrails section (Do/Don't/Escalate)"
        fi
    fi

    # --- Size check ---
    body_lines=$(count_body_lines "$skill_file")
    if [ "$body_lines" -gt 300 ]; then
        log_warning "Skill '$skill_name' SKILL.md is $body_lines lines — consider splitting into companion files"
    fi

    # --- Companion file check ---
    companion_count=$(find "$skill_dir" -name "*.md" ! -name "SKILL.md" | wc -l | tr -d ' ')
    if [ "$companion_count" -gt 0 ]; then
        log_info "Skill '$skill_name' has $companion_count companion file(s)"
    fi

    log_pass "Skill validated: $skill_name"
done

log_info "Total active skills: $SKILL_COUNT"
