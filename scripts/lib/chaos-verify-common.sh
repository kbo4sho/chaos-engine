# Shared paths and helpers for verify-chaos-engine. Sourced, not executed.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACT_ROOT="${CHAOS_VERIFY_ARTIFACTS:-$REPO_ROOT/artifacts/verify-chaos-engine}"
RUN_DIR="$ARTIFACT_ROOT/.run"
STATE_FILE="$RUN_DIR/state.json"
DEFAULT_BRANCH_PORT="${CHAOS_PORT:-13003}"
DEFAULT_MAIN_PORT="${CHAOS_MAIN_PORT:-13004}"
if [[ "$(uname -s)" == Darwin ]]; then
  CHROME_BIN="${CHAOS_CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
else
  CHROME_BIN="${CHAOS_CHROME:-/usr/bin/google-chrome}"
fi

mkdir -p "$ARTIFACT_ROOT" "$RUN_DIR"

chaos_json_get() {
  local key="$1"
  node -e '
    const fs = require("fs");
    const file = process.argv[1];
    const key = process.argv[2];
    if (!fs.existsSync(file)) process.exit(2);
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (data[key] == null) process.exit(3);
    process.stdout.write(String(data[key]));
  ' "$STATE_FILE" "$key"
}

chaos_pid_alive() {
  local pid="$1" status
  [[ "$pid" =~ ^[0-9]+$ && "$pid" -gt 1 ]] || return 1
  kill -0 "$pid" 2>/dev/null || return 1
  status="$(ps -p "$pid" -o stat= 2>/dev/null)" || return 1
  [[ -n "$status" && "$status" != *Z* ]]
}

chaos_pid_started() {
  LC_ALL=C ps -p "$1" -o lstart= 2>/dev/null | awk '{$1=$1; print}'
}

chaos_pid_is_server() {
  local pid="$1" cmd root started expected
  chaos_pid_alive "$pid" || return 1
  root="$(chaos_json_get serveRoot)" || return 1
  expected="$(chaos_json_get processStartedAt)" || return 1
  [[ -n "$expected" ]] || return 1
  started="$(chaos_pid_started "$pid")" || return 1
  [[ "$started" == "$expected" ]] || return 1
  cmd="$(ps -ww -p "$pid" -o command= 2>/dev/null)" || return 1
  # Exact argv rendering, never a substring such as another project's server.js.
  [[ "$cmd" == "node $root/server.js" || "$cmd" == "$(command -v node) $root/server.js" || "$cmd" == "$(node -p process.execPath) $root/server.js" ]]
}

chaos_port_owner() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    # Keep every owner: a second listener must fail the exact PID comparison.
    { lsof -iTCP:"$port" -sTCP:LISTEN -n -P -F p 2>/dev/null || true; } |
      awk '/^p[0-9]+$/ { print substr($0, 2) }' | sort -u
  elif command -v ss >/dev/null 2>&1; then
    ss -H -ltnp "sport = :$port" | node -e '
      let text = "";
      process.stdin.on("data", chunk => text += chunk);
      process.stdin.on("end", () => {
        const lines = text.trim().split("\n").filter(Boolean);
        if (lines.some(line => !/pid=\d+/.test(line))) process.exit(1);
        const pids = [...text.matchAll(/pid=(\d+)/g)].map(match => match[1]);
        console.log([...new Set(pids)].sort().join("\n"));
      });'
  else
    echo "port ownership requires lsof or ss" >&2
    return 1
  fi
}

chaos_sha256() {
  node -e '
    const fs = require("fs"), crypto = require("crypto");
    console.log(crypto.createHash("sha256").update(fs.readFileSync(process.argv[1] || 0)).digest("hex"));
  ' "$@"
}

chaos_wait_http() {
  local url="$1"
  local needle="$2"
  local attempts="${3:-50}"
  local i body
  for ((i=0; i<attempts; i++)); do
    body="$(curl -sf "$url" || true)"
    if [[ -n "$body" ]] && grep -aF -q "$needle" <<<"$body"; then
      return 0
    fi
    sleep 0.2
  done
  return 1
}
