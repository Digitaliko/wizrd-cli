#!/bin/bash
# Check: Agent file quality

log_info "Validating agents..."

if [ ! -d ".claude/agents" ]; then
    return 0 2>/dev/null || exit 0
fi

for agent_file in .claude/agents/*.md; do
    [ -f "$agent_file" ] || continue
    agent_name=$(basename "$agent_file" .md)

    # Skip template
    [ "$agent_name" = "_template" ] && continue

    # Frontmatter
    if ! has_frontmatter "$agent_file"; then
        log_critical "Agent '$agent_name' missing YAML frontmatter"
        continue
    fi

    name=$(get_frontmatter_field "$agent_file" "name")
    description=$(get_frontmatter_field "$agent_file" "description")
    color=$(get_frontmatter_field "$agent_file" "color")

    # Required fields
    if [ -z "$name" ]; then
        log_critical "Agent '$agent_name' missing 'name' in frontmatter"
    elif [ "$name" != "$agent_name" ]; then
        log_warning "Agent '$agent_name' name mismatch (file: $agent_name, frontmatter: $name)"
    fi

    if [ -z "$description" ]; then
        log_critical "Agent '$agent_name' missing 'description' in frontmatter"
    elif [[ ! "$description" == *"<example>"* ]]; then
        log_warning "Agent '$agent_name' description missing usage <example>"
    fi

    [ -z "$color" ] && log_warning "Agent '$agent_name' missing 'color' in frontmatter"

    # Required sections
    if ! has_section "$agent_file" "Role"; then
        log_warning "Agent '$agent_name' missing ## Role section"
    fi

    log_pass "Agent validated: $agent_name"
done
