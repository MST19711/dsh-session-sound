#!/bin/bash
# Idempotent installer for @deepseek-ai/dsh-session-sound (static Cordis package).
#
# Usage:
#   bash install.sh [--dsh-home <path>] [--profile <name>]
#
# Environment overrides:
#   DSH_HOME  (default: $HOME/.dsh)
#   PROFILE   (default: web)
#
# The package root (package.json + lib/ + assets/) must be this script's
# directory (i.e. run from the repo checkout).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
PROFILE="${PROFILE:-web}"

TARGET="$DSH_HOME/profiles/node_modules/@deepseek-ai/dsh-session-sound"
PATCH="$DSH_HOME/profiles/$PROFILE/cordis.patch.yml"

echo "DSH_HOME : $DSH_HOME"
echo "profile  : $PROFILE"

# ── 1) package files ────────────────────────────────────────────────────────
if [ -f "$TARGET/package.json" ]; then
  echo "[skip] plugin already installed at $TARGET"
else
  mkdir -p "$TARGET/lib" "$TARGET/assets"
  cp "$SCRIPT_DIR/package.json" "$TARGET/"
  cp "$SCRIPT_DIR/lib/index.js" "$SCRIPT_DIR/lib/client.js" "$TARGET/lib/"
  cp "$SCRIPT_DIR"/assets/*.oga "$SCRIPT_DIR/assets/NOTICE.md" "$TARGET/assets/"
  echo "[ok]   installed to $TARGET"
fi

# ── 2) profile patch (register the host row) ────────────────────────────────
BLOCK=$(cat <<'EOF'
- insert:
    - id: dsh-session-sound
      name: '@deepseek-ai/dsh-session-sound'
EOF
)

if [ -f "$PATCH" ] && grep -q 'dsh-session-sound' "$PATCH"; then
  echo "[skip] patch already registers dsh-session-sound in $PATCH"
else
  if [ ! -f "$PATCH" ]; then
    printf '%s\n' "$BLOCK" > "$PATCH"
  else
    # A fresh profile patch is the bare [] template; block entries must
    # replace that line, not follow it (flow list + block list = invalid YAML).
    sed -i '/^[[:space:]]*\[\][[:space:]]*$/d' "$PATCH"
    [ -n "$(tail -c 1 "$PATCH" 2>/dev/null)" ] && printf '\n' >> "$PATCH"
    printf '%s\n' "$BLOCK" >> "$PATCH"
  fi
  echo "[ok]   registered in $PATCH"
fi

# ── 3) restart hint ─────────────────────────────────────────────────────────
echo
echo "restart the web service to apply the change, then refresh the browser:"
echo "  systemctl --user restart dsh-web"
echo "(or relaunch: dsh --profile $PROFILE --port 3081)"
