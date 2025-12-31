#!/usr/bin/env bash
set -uo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Track failures
FAILURES=()

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

header() {
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

run_check() {
  local name="$1"
  local dir="$2"
  shift 2
  local cmd=("$@")

  echo -e "${BLUE}Running:${NC} ${cmd[*]}"
  echo ""

  if (cd "$dir" && "${cmd[@]}"); then
    echo -e "\n${GREEN}✓${NC} $name passed"
    return 0
  else
    echo -e "\n${RED}✗${NC} $name failed"
    FAILURES+=("$name")
    return 1
  fi
}

echo -e "${BLUE}Monorepo Health Check${NC}"
echo -e "Project root: $PROJECT_ROOT"

# tdn-cli checks
header "tdn-cli: Lint, Typecheck, Clippy & Rust Tests"
run_check "tdn-cli check" "$PROJECT_ROOT/tdn-cli" bun run check

header "tdn-cli: TypeScript Tests"
run_check "tdn-cli test:ts" "$PROJECT_ROOT/tdn-cli" bun run test:ts

# tdn-desktop checks
header "tdn-desktop: Full Check Suite"
run_check "tdn-desktop check:all" "$PROJECT_ROOT/tdn-desktop" bun run check:all

# Summary
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

if [ ${#FAILURES[@]} -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed!${NC}\n"
  exit 0
else
  echo -e "${RED}✗ ${#FAILURES[@]} check(s) failed:${NC}"
  for failure in "${FAILURES[@]}"; do
    echo -e "  ${RED}-${NC} $failure"
  done
  echo ""
  exit 1
fi
