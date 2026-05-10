set shell := ["bash", "-euo", "pipefail", "-c"]

# List recipes
default:
    @just --list

# Bitwarden → Cloudflare secrets sync + wrangler deploy (atomic).
deploy: _require-bws-token
    bws run -- bin/_deploy

# Push current Bitwarden values to Cloudflare Worker secrets without deploying.
secrets-sync: _require-bws-token
    bws run -- bin/_secrets-sync

# List secrets in Bitwarden Secrets Manager (names + ids, no values).
secrets-list: _require-bws-token
    bws secret list | jq '[.[] | {key, id}]'

# wrangler dev with bws-injected secrets — local Worker preview at http://localhost:8787
dev: _require-bws-token
    bws run -- wrangler dev

_require-bws-token:
    @[ -n "${BWS_ACCESS_TOKEN:-}" ] || { echo "BWS_ACCESS_TOKEN unset. Run: source bin/load-bws-token" >&2; exit 1; }
