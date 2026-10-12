#!/usr/bin/env bash
#
# Claude Code web environment setup script.
#
# This is SELF-CONTAINED on purpose: paste this entire file into the "Setup
# script" field in the environment settings. Do NOT point the env at the repo
# path — pasting makes it survive the repo being wiped or re-cloned. Keep this
# repo copy in sync as the source of record — and re-paste it into the
# environment every time this file changes; the environment holds a copy, not
# a reference, so an edit here has no effect until it is pasted again.
#
# Design rule (learned from the July 2026 outages): ONLY `npm ci` may fail the
# setup. Every other step is best-effort and must never exit non-zero — a single
# unrelated upstream hiccup (a broken apt PPA during the Chromium install, a
# GitHub release blip) previously aborted the whole session under `set -e` and
# silently killed a routine day. The routines are MCP/CLI-native and detect
# missing optional tools at runtime.

set -euo pipefail

# --- Locate the Next.js app directory --------------------------------------
# In the Claude Code web env, $HOME and CWD can differ (/root vs /home/user).
APP_DIR=""
CWD="$(pwd)"
for candidate in \
  "$CWD/yogakit" \
  "$CWD/YogaKit" \
  "$CWD/repo/YogaKit" \
  "$HOME/yogakit" \
  "$HOME/YogaKit/YogaKit" \
  "$HOME/repo/yogakit"; do
  if [ -d "$candidate" ] && [ -f "$candidate/package.json" ]; then
    APP_DIR="$candidate"
    break
  fi
done
if [ -z "$APP_DIR" ]; then
  APP_DIR="$(find "$CWD" "$HOME" -maxdepth 4 -name package.json -path "*/package.json" 2>/dev/null | head -1 | xargs -r dirname || true)"
fi
if [ -z "$APP_DIR" ] || [ ! -d "$APP_DIR" ]; then
  echo "ERROR: Could not find the YogaKit app directory" >&2
  echo "       CWD is: $CWD   HOME is: $HOME" >&2
  ls -la "$CWD" >&2
  exit 1
fi
REPO_ROOT="$(cd "$APP_DIR" && git rev-parse --show-toplevel 2>/dev/null || echo "$APP_DIR")"
echo "==> Found app directory: $APP_DIR"

# --- CRITICAL: app dependencies (the ONLY step allowed to fail setup) ------
echo "==> Installing app dependencies (CRITICAL)"
cd "$APP_DIR"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

# --- BEST-EFFORT from here down: nothing below may fail the setup -----------

echo "==> [best-effort] Installing Playwright Chromium + OS deps"
# Browser validation only; the routines never require a browser. If apt/PPA
# state is broken this WARNs and continues instead of aborting the session.
#
# NOTE: the package is `@playwright/cli` — plain `playwright-cli` on npm is a
# different, deprecated package ("Deprecated package, use @playwright/cli
# instead.", frozen at 0.262.0). Both provide a `playwright-cli` bin, which is
# how this went undetected for 14 days: the bin name matches, the package
# doesn't. `@playwright/cli` is also what Homebrew's `playwright-cli` formula
# installs, which is why this worked on a laptop and not in the container.
PLAYWRIGHT_OK=0
if npx playwright install --with-deps chromium 2>&1; then
  if npm install -g @playwright/cli >/dev/null 2>&1; then
    echo "   OK: @playwright/cli installed globally"
  else
    echo "   WARNING: @playwright/cli global install failed — falling back to 'npx playwright-cli'"
  fi
  # `playwright-cli open` defaults to the `chrome` channel (a separate Chrome
  # for Testing distribution), not the vanilla `chromium` build the line above
  # installs — "Chromium distribution 'chrome' is not found" confirmed live
  # 2026-10-12. Point it at the chromium binary `playwright` (a transitive dep
  # of `@playwright/test`, so this resolves post-`npm ci` with no extra
  # install) already knows how to find, via the CLI's own default config path.
  CHROMIUM_PATH="$(node -e "console.log(require('playwright').chromium.executablePath())" 2>/dev/null || true)"
  if [ -n "$CHROMIUM_PATH" ] && [ -x "$CHROMIUM_PATH" ]; then
    mkdir -p "$APP_DIR/.playwright"
    cat > "$APP_DIR/.playwright/cli.config.json" <<JSON
{"browser":{"browserName":"chromium","launchOptions":{"executablePath":"$CHROMIUM_PATH","headless":true,"args":["--no-sandbox"]}}}
JSON
    echo "   OK: wrote .playwright/cli.config.json -> $CHROMIUM_PATH"
  else
    echo "   WARNING: could not resolve chromium executablePath — playwright-cli will try its 'chrome' channel default and likely fail"
  fi
  if { playwright-cli open "about:blank" && playwright-cli close; } >/dev/null 2>&1 \
    || { npx playwright-cli open "about:blank" && npx playwright-cli close; } >/dev/null 2>&1; then
    PLAYWRIGHT_OK=1; echo "   OK: playwright-cli launched a browser"
  else
    echo "   WARNING: playwright-cli could not launch — browser validation deferred"
  fi
else
  echo "   WARNING: Chromium/OS-dep install failed — browser validation deferred (does NOT block routines)"
fi
echo "$PLAYWRIGHT_OK" > "$REPO_ROOT/.playwright-available" 2>/dev/null || true

echo "==> [best-effort] Installing Datadog pup CLI (headless Datadog access; survives MCP loss)"
# pup (DataDog/pup, public, Apache-2.0) authenticates from DD_API_KEY/DD_APP_KEY/
# DD_SITE env vars — no interactive OAuth — so it is the reliable Datadog path for
# an unattended run where the OAuth-based MCP connector can go dark and cannot be
# re-authed remotely. The observation skills are already written in pup.
PUP_VERSION="1.7.0"   # DataDog/pup latest as of 2026-07-22; bump as needed
PUP_OK=0
if command -v pup >/dev/null 2>&1; then
  PUP_OK=1; echo "   pup already present ($(pup version 2>/dev/null | head -1 || echo installed))"
else
  case "$(uname -m)" in
    x86_64|amd64)  PUP_ARCH="Linux_x86_64" ;;
    aarch64|arm64) PUP_ARCH="Linux_arm64" ;;
    *)             PUP_ARCH="" ;;
  esac
  if [ -n "$PUP_ARCH" ]; then
    url="https://github.com/DataDog/pup/releases/download/v${PUP_VERSION}/pup_${PUP_VERSION}_${PUP_ARCH}.tar.gz"
    tmp="$(mktemp -d)"
    if curl -fsSL "$url" -o "$tmp/pup.tgz" && tar -xzf "$tmp/pup.tgz" -C "$tmp"; then
      if install -m 0755 "$tmp/pup" /usr/local/bin/pup 2>/dev/null; then :; else
        mkdir -p "$HOME/.local/bin" && install -m 0755 "$tmp/pup" "$HOME/.local/bin/pup" && export PATH="$HOME/.local/bin:$PATH"
      fi
      command -v pup >/dev/null 2>&1 && { PUP_OK=1; echo "   OK: pup v${PUP_VERSION} installed"; }
    fi
    rm -rf "$tmp"
  fi
  [ "$PUP_OK" -eq 1 ] || echo "   WARNING: pup install failed — Datadog CLI fallback unavailable this session"
fi
# Headless auth check (no interactive login) using the API/APP keys.
if [ "$PUP_OK" -eq 1 ] && [ -n "${DD_API_KEY:-}" ] && [ -n "${DD_APP_KEY:-}" ]; then
  export DD_SITE="${DD_SITE:-us5.datadoghq.com}"
  if pup monitors list -o json >/dev/null 2>&1; then
    echo "   OK: pup authenticated via DD_API_KEY/DD_APP_KEY (site $DD_SITE)"
  else
    echo "   WARNING: pup installed but auth check failed — verify DD_API_KEY/DD_APP_KEY/DD_SITE"; PUP_OK=0
  fi
elif [ "$PUP_OK" -eq 1 ]; then
  echo "   WARNING: pup installed but DD_API_KEY/DD_APP_KEY unset — set them for headless Datadog access"; PUP_OK=0
fi
echo "$PUP_OK" > "$REPO_ROOT/.datadog-cli-available" 2>/dev/null || true

echo "==> Checking env vars (WARN only — never fatal)"
# App-login vars: routines/skills use the TESTING_* names; DDOG_SYNTHETIC_* are aliases.
[ -n "${TESTING_URL:-}" ] && echo "   OK: TESTING_URL set" \
  || echo "   WARNING: TESTING_URL unset — falls back to the issue's own PR preview, resolved via the GitHub Deployments API"
[ -n "${DDOG_SYNTHETIC_TESTING_EMAIL:-}${TESTING_EMAIL:-}" ] \
  && echo "   OK: synthetic-test login email set" \
  || echo "   WARNING: no DDOG_SYNTHETIC_TESTING_EMAIL / TESTING_EMAIL — browser validation & OAuth reconnect will skip"
# Vercel Deployment Protection: without this, PR preview URLs 302 to
# vercel.com/sso-api and playwright-cli can never reach the app under test.
[ -n "${VERCEL_AUTOMATION_BYPASS_SECRET:-}" ] \
  && echo "   OK: VERCEL_AUTOMATION_BYPASS_SECRET set — preview deploys reachable by playwright-cli" \
  || echo "   WARNING: VERCEL_AUTOMATION_BYPASS_SECRET unset — PR preview deploys are behind Vercel SSO and unreachable"
# Dedicated Supabase test account for auth-gated browser validation. Preview
# deploys share the PRODUCTION Supabase project (branching is off), so this
# must be a clearly-named account, never a human's. Same identity Datadog
# monitors already notify (`@syntheticstesting@gmail.com`, `datadog/`) —
# password added 2026-10 (007 T050 / FR-039) so autodev can also log in as it.
[ -n "${TESTING_EMAIL:-}${DDOG_SYNTHETIC_TESTING_EMAIL:-}" ] && [ -n "${TESTING_PASSWORD:-}${DDOG_SYNTHETIC_TESTING_PASSWORD:-}" ] \
  && echo "   OK: TESTING_EMAIL/TESTING_PASSWORD set — auth-gated routes can be session-minted via signInWithPassword" \
  || echo "   WARNING: TESTING_EMAIL/TESTING_PASSWORD unset — auth-gated browser validation will skip"
# Gmail OAuth self-heal (autodev /reconnect-oauth, script-based, no browser).
gmail_ready=1
for v in GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET ENCRYPTION_KEY NEXT_PUBLIC_SUPABASE_URL SUPABASE_SECRET_KEY; do
  [ -z "${!v:-}" ] && gmail_ready=0
done
[ "$gmail_ready" -eq 1 ] \
  && echo "   OK: Gmail OAuth self-heal env present (autodev can auto-reconnect Gmail)" \
  || echo "   WARNING: Gmail OAuth self-heal env incomplete — Gmail reconnect stays owner-only"
# Datadog credentials.
{ [ -n "${DD_API_KEY:-}" ] && [ -n "${DD_APP_KEY:-}" ]; } \
  && echo "   OK: DD_API_KEY/DD_APP_KEY set (site ${DD_SITE:-us5.datadoghq.com})" \
  || echo "   WARNING: DD_API_KEY/DD_APP_KEY unset — Datadog access (pup + live apply + CI Visibility) disabled"

echo "==> Setup complete"
