#!/bin/bash
# Shared helpers for wizrd validation checks

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
CRITICAL=0
WARNINGS=0
PASSED=0

log_critical() {
    CRITICAL=$((CRITICAL+1))
    echo -e "${RED}[CRITICAL]${NC} $1"
}

log_warning() {
    WARNINGS=$((WARNINGS+1))
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_pass() {
    PASSED=$((PASSED+1))
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Extract YAML frontmatter field value
get_frontmatter_field() {
    local file="$1"
    local field="$2"
    sed -n '/^---$/,/^---$/p' "$file" | grep "^${field}:" | sed "s/^${field}:[[:space:]]*//" | head -1
}

# Check if file starts with YAML frontmatter
has_frontmatter() {
    local file="$1"
    head -1 "$file" | grep -q "^---$"
}

# Check if a section header exists in file (## Header)
has_section() {
    local file="$1"
    local section="$2"
    grep -q "^## ${section}" "$file" 2>/dev/null
}

# Count lines in file (excluding frontmatter)
count_body_lines() {
    local file="$1"
    local in_frontmatter=false
    local count=0
    local started=false
    while IFS= read -r line; do
        if [ "$line" = "---" ] && [ "$started" = false ]; then
            in_frontmatter=true
            started=true
            continue
        fi
        if [ "$line" = "---" ] && [ "$in_frontmatter" = true ]; then
            in_frontmatter=false
            continue
        fi
        if [ "$in_frontmatter" = false ]; then
            count=$((count+1))
        fi
    done < "$file"
    echo "$count"
}

# Detect wizrd level from CLAUDE.md
detect_level() {
    if [ -f "CLAUDE.md" ]; then
        grep -o "Wizrd Level: L[0-9]" CLAUDE.md 2>/dev/null | head -1 | sed 's/Wizrd Level: //'
    fi
}
