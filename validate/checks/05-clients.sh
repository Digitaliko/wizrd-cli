#!/bin/bash
# Check: Client folder structure and hygiene

log_info "Validating client folders..."

if [ ! -d "clients" ]; then
    return 0 2>/dev/null || exit 0
fi

for client_dir in clients/*/; do
    [ -d "$client_dir" ] || continue
    client_name=$(basename "$client_dir")

    # Skip templates/examples
    [[ "$client_name" == "templates" || "$client_name" == ".examples" || "$client_name" == .* ]] && continue

    # Skip flat L1 submodule stubs — CLAUDE.md lives in the L1 repo, not at L0
    # Use git ls-files (mode 160000 = gitlink/submodule) — more reliable than grepping .gitmodules
    if git ls-files --stage "clients/${client_name}" 2>/dev/null | grep -q "^160000"; then
        log_pass "Client '$client_name' is a flat L1 submodule (CLAUDE.md in L1 repo)"
        continue
    fi

    claude_file="${client_dir}CLAUDE.md"

    if [ ! -f "$claude_file" ]; then
        log_critical "Client '$client_name' missing CLAUDE.md"
        continue
    fi

    if ! has_frontmatter "$claude_file"; then
        log_critical "Client '$client_name' CLAUDE.md missing frontmatter"
        continue
    fi

    client_field=$(get_frontmatter_field "$claude_file" "client")
    industry=$(get_frontmatter_field "$claude_file" "industry")
    status=$(get_frontmatter_field "$claude_file" "status")

    [ -z "$client_field" ] && log_warning "Client '$client_name' missing 'client' field"
    [ -z "$industry" ] && log_warning "Client '$client_name' missing 'industry' field"

    if [ -z "$status" ]; then
        log_critical "Client '$client_name' missing 'status' field"
    elif [[ ! "$status" =~ ^(Active|Paused|Completed|Lead|Prospect|Experiment|ON\ HOLD|Waiting) ]]; then
        log_warning "Client '$client_name' has invalid status: $status"
    fi

    # Active clients need context.md and tasks.md
    if [[ "$status" =~ ^Active ]]; then
        [ ! -f "${client_dir}context.md" ] && log_warning "Active client '$client_name' missing context.md"
        [ ! -f "${client_dir}tasks.md" ] && log_warning "Active client '$client_name' missing tasks.md"
    fi

    log_pass "Client validated: $client_name"
done
