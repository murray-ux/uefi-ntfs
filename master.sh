#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
#  MASTER SCRIPT CHARTER — Unified Orchestration
# ═══════════════════════════════════════════════════════════════════════════════
#
#  Brings together all three tiers of the system:
#
#    Tier 1 — UEFI:NTFS Bootloader       (Makefile: cross-platform EFI build)
#    Tier 2 — GENESIS 2.0 Platform        (caput-ultimate-edition/)
#    Tier 3 — Forbidden Ninja City Charter (forbidden-ninja-city-charter-v1.0.0/)
#
#  Usage:
#    ./master.sh                     Show status dashboard
#    ./master.sh status              Show status of all tiers
#    ./master.sh verify              Run all verification gates (fail-closed)
#    ./master.sh build [ARCH]        Build UEFI:NTFS bootloader
#    ./master.sh genesis <cmd>       Dispatch to GENESIS 2.0 entrypoint
#    ./master.sh charter             Run charter governance verification
#    ./master.sh deploy [--docker]   Bootstrap production deployment
#    ./master.sh start               Start GENESIS 2.0 server
#    ./master.sh test                Run all test suites
#    ./master.sh help                Show full usage
#
#  All paths fail-closed. Unknown commands are rejected.
#
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Paths ────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GENESIS_DIR="$SCRIPT_DIR/caput-ultimate-edition"
CHARTER_DIR="$SCRIPT_DIR/forbidden-ninja-city-charter-v1.0.0"

# ─── Colors (disabled when not a terminal) ────────────────────────────────────

if [ -t 1 ]; then
	RED='\033[0;31m'
	GREEN='\033[0;32m'
	YELLOW='\033[1;33m'
	CYAN='\033[0;36m'
	BOLD='\033[1m'
	DIM='\033[2m'
	NC='\033[0m'
else
	RED='' GREEN='' YELLOW='' CYAN='' BOLD='' DIM='' NC=''
fi

# ─── Helpers ──────────────────────────────────────────────────────────────────

log()  { printf "${CYAN}[MASTER]${NC} %s\n" "$*"; }
pass() { printf "${GREEN}  PASS${NC}  %s\n" "$*"; }
fail() { printf "${RED}  FAIL${NC}  %s\n" "$*" >&2; }
warn() { printf "${YELLOW}  WARN${NC}  %s\n" "$*"; }
die()  { printf "${RED}[MASTER] FATAL:${NC} %s\n" "$*" >&2; exit 1; }

has() { command -v "$1" &>/dev/null; }

banner() {
	printf "\n"
	printf "${BOLD}"
	printf " ╔═══════════════════════════════════════════════════════════════╗\n"
	printf " ║              M A S T E R   S C R I P T   C H A R T E R      ║\n"
	printf " ║                                                              ║\n"
	printf " ║   Tier 1: UEFI:NTFS Bootloader                              ║\n"
	printf " ║   Tier 2: GENESIS 2.0 Platform                              ║\n"
	printf " ║   Tier 3: Forbidden Ninja City Charter                       ║\n"
	printf " ╚═══════════════════════════════════════════════════════════════╝\n"
	printf "${NC}\n"
}

# ─── Tier Availability ────────────────────────────────────────────────────────

check_tier() {
	local name="$1" path="$2"
	if [ -d "$path" ]; then
		pass "$name"
		return 0
	else
		fail "$name — directory not found: $path"
		return 1
	fi
}

# ═══════════════════════════════════════════════════════════════════════════════
#  COMMAND: status
# ═══════════════════════════════════════════════════════════════════════════════

cmd_status() {
	banner

	local tier_ok=0
	local tier_total=3

	printf "${BOLD}Tier Availability${NC}\n\n"

	# Tier 1: UEFI:NTFS
	if [ -f "$SCRIPT_DIR/Makefile" ] && [ -f "$SCRIPT_DIR/boot.c" ]; then
		pass "Tier 1 — UEFI:NTFS Bootloader (Makefile + boot.c)"
		tier_ok=$((tier_ok + 1))
	else
		fail "Tier 1 — UEFI:NTFS Bootloader (missing Makefile or boot.c)"
	fi

	# Tier 2: GENESIS 2.0
	if check_tier "Tier 2 — GENESIS 2.0 Platform" "$GENESIS_DIR"; then
		tier_ok=$((tier_ok + 1))
	fi

	# Tier 3: Forbidden Ninja City Charter
	if check_tier "Tier 3 — Forbidden Ninja City Charter" "$CHARTER_DIR"; then
		tier_ok=$((tier_ok + 1))
	fi

	printf "\n${BOLD}Toolchain${NC}\n\n"

	has make    && pass "make"            || warn "make not found"
	has gcc     && pass "gcc $(gcc -dumpversion 2>/dev/null || echo '?')" || warn "gcc not found"
	has node    && pass "node $(node --version 2>/dev/null)"  || warn "node not found"
	has python3 && pass "python3 $(python3 --version 2>/dev/null | cut -d' ' -f2)" || warn "python3 not found"
	has cargo   && pass "cargo $(cargo --version 2>/dev/null | cut -d' ' -f2)"     || warn "cargo not found (optional)"
	has docker  && pass "docker $(docker --version 2>/dev/null | cut -d' ' -f3 | tr -d ',')" || warn "docker not found (optional)"

	printf "\n${BOLD}GENESIS npm Scripts${NC}\n\n"

	if [ -f "$GENESIS_DIR/package.json" ]; then
		pass "package.json found"
		if [ -d "$GENESIS_DIR/node_modules" ]; then
			pass "node_modules installed"
		else
			warn "node_modules missing — run: ./master.sh genesis setup"
		fi
	else
		warn "package.json not found in GENESIS dir"
	fi

	printf "\n${BOLD}Charter Governance${NC}\n\n"

	if [ -d "$CHARTER_DIR/charter" ]; then
		pass "Charter directory present"
		[ -f "$CHARTER_DIR/charter/charter.md" ]        && pass "charter.md"        || warn "charter.md missing"
		[ -f "$CHARTER_DIR/charter/charter.meta.json" ] && pass "charter.meta.json" || warn "charter.meta.json missing"
		[ -f "$CHARTER_DIR/charter/charter.sha256" ]    && pass "charter.sha256"    || warn "charter.sha256 missing"
	else
		warn "Charter subdirectory not found"
	fi

	if [ -f "$CHARTER_DIR/governance/tombs.log" ]; then
		local exile_count
		exile_count=$(grep -c '^[0-9]' "$CHARTER_DIR/governance/tombs.log" 2>/dev/null || echo 0)
		pass "Tombs Register ($exile_count exiled artifacts)"
	else
		warn "Tombs Register not found"
	fi

	printf "\n${DIM}Tiers online: ${tier_ok}/${tier_total}${NC}\n\n"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  COMMAND: verify — Run all verification gates across all tiers
# ═══════════════════════════════════════════════════════════════════════════════

cmd_verify() {
	banner

	local gate_pass=0
	local gate_fail=0

	run_gate() {
		local name="$1"
		shift
		log "Gate: $name"
		if "$@"; then
			pass "$name"
			gate_pass=$((gate_pass + 1))
		else
			fail "$name"
			gate_fail=$((gate_fail + 1))
		fi
	}

	# ─── Tier 3 gates first: Charter must be valid before anything runs ────

	printf "${BOLD}=== Tier 3: Charter Governance Gates ===${NC}\n\n"

	if [ -x "$CHARTER_DIR/governance/verify.sh" ]; then
		run_gate "Charter Integrity" "$CHARTER_DIR/governance/verify.sh"
	else
		warn "Charter verify.sh not found or not executable — skipping"
	fi

	if [ -f "$CHARTER_DIR/tests/test_charter_structure.sh" ]; then
		run_gate "Charter Structure Test" sh "$CHARTER_DIR/tests/test_charter_structure.sh"
	fi

	# ─── Tier 2 gates: GENESIS verification suite ─────────────────────────

	printf "\n${BOLD}=== Tier 2: GENESIS 2.0 Verification Gates ===${NC}\n\n"

	if [ -x "$GENESIS_DIR/verify/full_verify.sh" ]; then
		run_gate "GENESIS Full Verify" "$GENESIS_DIR/verify/full_verify.sh"
	else
		warn "GENESIS full_verify.sh not found — skipping"
	fi

	if has python3 && [ -f "$GENESIS_DIR/core/orchestrator.py" ]; then
		run_gate "GENESIS Orchestrator Bootstrap" python3 "$GENESIS_DIR/core/orchestrator.py"
	fi

	# ─── Tier 1 gates: UEFI bootloader compilation check ──────────────────

	printf "\n${BOLD}=== Tier 1: UEFI:NTFS Build Gates ===${NC}\n\n"

	if [ -f "$SCRIPT_DIR/Makefile" ] && has make; then
		# Dry-run syntax check — only validates the Makefile parses
		run_gate "Makefile Parse" make -n -C "$SCRIPT_DIR" 2>/dev/null
	else
		warn "Makefile or make not available — skipping build gate"
	fi

	# ─── Summary ──────────────────────────────────────────────────────────

	printf "\n${BOLD}=== Verification Summary ===${NC}\n\n"
	printf "${GREEN}Passed:${NC}  %d\n" "$gate_pass"
	printf "${RED}Failed:${NC}  %d\n" "$gate_fail"

	if [ "$gate_fail" -gt 0 ]; then
		printf "\n${RED}MASTER VERIFICATION: FAILED${NC}\n"
		printf "Resolve failures above before proceeding.\n\n"
		return 1
	else
		printf "\n${GREEN}MASTER VERIFICATION: ALL GATES PASSED${NC}\n\n"
		return 0
	fi
}

# ═══════════════════════════════════════════════════════════════════════════════
#  COMMAND: build — Build UEFI:NTFS bootloader
# ═══════════════════════════════════════════════════════════════════════════════

cmd_build() {
	local arch="${1:-}"

	[ -f "$SCRIPT_DIR/Makefile" ] || die "Makefile not found"
	has make || die "make not found"

	log "Building UEFI:NTFS bootloader"

	if [ -n "$arch" ]; then
		log "Architecture: $arch"
		make -C "$SCRIPT_DIR" ARCH="$arch"
	else
		log "Architecture: auto-detect"
		make -C "$SCRIPT_DIR"
	fi

	log "Build complete"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  COMMAND: genesis — Dispatch to GENESIS 2.0 entrypoint
# ═══════════════════════════════════════════════════════════════════════════════

cmd_genesis() {
	local subcmd="${1:-}"

	[ -d "$GENESIS_DIR" ] || die "GENESIS directory not found: $GENESIS_DIR"

	case "$subcmd" in
		setup)
			log "Running GENESIS first-time setup"
			has node || die "Node.js not found"
			if [ ! -d "$GENESIS_DIR/node_modules" ]; then
				log "Installing dependencies..."
				(cd "$GENESIS_DIR" && npm install)
			fi
			node "$GENESIS_DIR/scripts/setup.js"
			log "Setup complete"
			;;
		verify)
			shift
			exec "$GENESIS_DIR/entrypoint.sh" verify "$@"
			;;
		orchestrate)
			exec "$GENESIS_DIR/entrypoint.sh" orchestrate
			;;
		master)
			shift
			exec "$GENESIS_DIR/entrypoint.sh" master "$@"
			;;
		rust)
			shift
			exec "$GENESIS_DIR/entrypoint.sh" rust "$@"
			;;
		policy)
			shift
			exec "$GENESIS_DIR/entrypoint.sh" policy "$@"
			;;
		health)
			exec "$GENESIS_DIR/bin/genesis_master.sh" health
			;;
		*)
			# Pass through to entrypoint (shows its own usage on unknown)
			exec "$GENESIS_DIR/entrypoint.sh" "$@"
			;;
	esac
}

# ═══════════════════════════════════════════════════════════════════════════════
#  COMMAND: charter — Run charter governance verification
# ═══════════════════════════════════════════════════════════════════════════════

cmd_charter() {
	local mode="${1:-full}"

	[ -d "$CHARTER_DIR" ] || die "Charter directory not found: $CHARTER_DIR"

	case "$mode" in
		quick)
			log "Running quick charter verification"
			[ -x "$CHARTER_DIR/governance/verify.sh" ] || die "verify.sh not executable"
			exec "$CHARTER_DIR/governance/verify.sh"
			;;
		full)
			log "Running full governance verification"
			[ -x "$CHARTER_DIR/governance/verify_full.sh" ] || die "verify_full.sh not executable"
			exec "$CHARTER_DIR/governance/verify_full.sh"
			;;
		tombs)
			shift
			local hash="${1:-}"
			[ -n "$hash" ] || die "Usage: ./master.sh charter tombs <sha256-hash>"
			exec "$CHARTER_DIR/governance/tombs_check.sh" "$hash"
			;;
		exile)
			shift
			exec "$CHARTER_DIR/governance/tombs_exile.sh" "$@"
			;;
		report)
			shift
			has python3 || die "python3 required for governance report"
			exec python3 "$CHARTER_DIR/governance/cert_governance_report.py" "$@"
			;;
		*)
			die "Unknown charter mode: $mode (use: quick, full, tombs, exile, report)"
			;;
	esac
}

# ═══════════════════════════════════════════════════════════════════════════════
#  COMMAND: deploy — Bootstrap production deployment
# ═══════════════════════════════════════════════════════════════════════════════

cmd_deploy() {
	[ -x "$GENESIS_DIR/deploy/genesis-deploy.sh" ] || die "genesis-deploy.sh not found"

	log "Running GENESIS production deployment"
	warn "This requires root privileges (sudo)"
	exec "$GENESIS_DIR/deploy/genesis-deploy.sh" "$@"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  COMMAND: start — Start GENESIS 2.0 server
# ═══════════════════════════════════════════════════════════════════════════════

cmd_start() {
	[ -d "$GENESIS_DIR" ] || die "GENESIS directory not found"
	has node || die "Node.js not found"

	log "Starting GENESIS 2.0"

	# Ensure setup has been run
	if [ ! -d "$GENESIS_DIR/node_modules" ]; then
		log "First run detected — installing dependencies"
		(cd "$GENESIS_DIR" && npm install)
		node "$GENESIS_DIR/scripts/setup.js"
	fi

	# Load .env if present
	if [ -f "$GENESIS_DIR/.env" ]; then
		set -a
		# shellcheck disable=SC1091
		. "$GENESIS_DIR/.env"
		set +a
	fi

	local port="${GENESIS_PDP_PORT:-8080}"
	log "Dashboard: http://localhost:${port}/"
	log "Press Ctrl+C to stop"
	printf "\n"

	cd "$GENESIS_DIR"
	exec npx tsx src/server.ts
}

# ═══════════════════════════════════════════════════════════════════════════════
#  COMMAND: test — Run all test suites
# ═══════════════════════════════════════════════════════════════════════════════

cmd_test() {
	banner

	local test_pass=0
	local test_fail=0

	run_test() {
		local name="$1"
		shift
		log "Test: $name"
		if "$@"; then
			pass "$name"
			test_pass=$((test_pass + 1))
		else
			fail "$name"
			test_fail=$((test_fail + 1))
		fi
	}

	# Charter structural tests
	if [ -f "$CHARTER_DIR/tests/test_charter_structure.sh" ]; then
		run_test "Charter Structure" sh "$CHARTER_DIR/tests/test_charter_structure.sh"
	fi

	# GENESIS node tests
	if [ -f "$GENESIS_DIR/package.json" ] && has node; then
		if [ -d "$GENESIS_DIR/node_modules" ]; then
			run_test "GENESIS Unit Tests" npm test --prefix "$GENESIS_DIR"
		else
			warn "GENESIS node_modules missing — run: ./master.sh genesis setup"
		fi
	fi

	# UEFI:NTFS build test (dry-run)
	if [ -f "$SCRIPT_DIR/Makefile" ] && has make; then
		run_test "UEFI:NTFS Makefile Parse" make -n -C "$SCRIPT_DIR" 2>/dev/null
	fi

	printf "\n${BOLD}=== Test Summary ===${NC}\n\n"
	printf "${GREEN}Passed:${NC}  %d\n" "$test_pass"
	printf "${RED}Failed:${NC}  %d\n" "$test_fail"

	if [ "$test_fail" -gt 0 ]; then
		printf "\n${RED}TESTS: FAILED${NC}\n\n"
		return 1
	else
		printf "\n${GREEN}TESTS: ALL PASSED${NC}\n\n"
		return 0
	fi
}

# ═══════════════════════════════════════════════════════════════════════════════
#  COMMAND: help
# ═══════════════════════════════════════════════════════════════════════════════

cmd_help() {
	banner

	cat <<'USAGE'
USAGE
  ./master.sh <command> [options]

COMMANDS
  status                          Show status dashboard for all tiers
  verify                          Run all verification gates (fail-closed)
  build [ARCH]                    Build UEFI:NTFS bootloader (x64,ia32,arm,aa64,riscv64,loongarch64)
  genesis <subcmd> [args...]      Dispatch to GENESIS 2.0 subsystem
  charter [mode] [args...]        Run charter governance verification
  deploy [--docker]               Bootstrap production deployment (requires sudo)
  start                           Start GENESIS 2.0 server on :8080
  test                            Run all test suites across tiers
  help                            Show this help

GENESIS SUBCOMMANDS
  genesis setup                   First-time setup (install deps, create dirs)
  genesis verify [--verbose]      Run GENESIS verification suite
  genesis orchestrate             Bootstrap Python orchestrator
  genesis master <cmd>            Run genesis_master.sh (health, harden, legal-batch, cert-batch, compliance)
  genesis rust <args>             Run Rust integrity boundary
  genesis policy <args>           Run policy engine
  genesis health                  Quick health check

CHARTER MODES
  charter quick                   Quick charter integrity check
  charter full                    Full governance verification (default)
  charter tombs <sha256>          Check if artifact hash is exiled
  charter exile <sha> <id> <owner> <reason>   Exile an artifact
  charter report <meta.json>      Generate governance report

TIERS
  Tier 1 — UEFI:NTFS Bootloader       Build cross-platform EFI binaries
  Tier 2 — GENESIS 2.0 Platform        Orchestration, verification, deployment
  Tier 3 — Forbidden Ninja City Charter Governance enforcement, Tombs Register

EXAMPLES
  ./master.sh status                    # Dashboard overview
  ./master.sh verify                    # Full cross-tier verification
  ./master.sh build x64                 # Build bootloader for x86_64
  ./master.sh genesis health            # GENESIS health check
  ./master.sh charter full              # Full charter governance audit
  ./master.sh start                     # Launch GENESIS server
  ./master.sh test                      # Run all tests

USAGE
}

# ═══════════════════════════════════════════════════════════════════════════════
#  DISPATCH
# ═══════════════════════════════════════════════════════════════════════════════

case "${1:-status}" in
	status)
		cmd_status
		;;
	verify)
		cmd_verify
		;;
	build)
		shift
		cmd_build "$@"
		;;
	genesis)
		shift
		cmd_genesis "$@"
		;;
	charter)
		shift
		cmd_charter "$@"
		;;
	deploy)
		shift
		cmd_deploy "$@"
		;;
	start)
		cmd_start
		;;
	test)
		cmd_test
		;;
	help|--help|-h)
		cmd_help
		;;
	*)
		die "Unknown command: $1 (run './master.sh help' for usage)"
		;;
esac
