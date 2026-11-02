# Shared paths and helpers for verify-chaos-engine. Sourced, not executed.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACT_ROOT="${CHAOS_VERIFY_ARTIFACTS:-$REPO_ROOT/artifacts/verify-chaos-engine}"
RUN_DIR="$ARTIFACT_ROOT/.run"
STATE_FILE="$RUN_DIR/state.json"
DEFAULT_BRANCH_PORT="${CHAOS_PORT:-13003}"
DEFAULT_MAIN_PORT="${CHAOS_MAIN_PORT:-13004}"
CHROME_BIN="${CHAOS_CHROME:-/usr/bin/google-chrome}"

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
  local pid="$1"
  [[ -n "$pid" && -d "/proc/$pid" ]]
}

chaos_pid_is_server() {
  local pid="$1"
  local cmd
  cmd="$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)"
  [[ "$cmd" == *server.js* ]]
}

chaos_port_owner() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN -n -P -F p 2>/dev/null | awk '/^p/ { print substr($0, 2); exit }'
    return
  fi
  netstat -ltnp 2>/dev/null | awk -v port=":$port" '
    $4 ~ port"$" {
      if (match($0, /[0-9]+\//)) {
        print substr($0, RSTART, RLENGTH-1);
        exit;
      }
    }'
}

chaos_sha256() {
  sha256sum "$1" | awk '{print $1}'
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
