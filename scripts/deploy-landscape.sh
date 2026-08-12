#!/bin/bash
# SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
# SPDX-License-Identifier: Apache-2.0
# Automated deployment script for landscape.opendesk-edu.org
#
# The live site is served by the `landscape-opendesk-edu` Docker container,
# built from the git checkout at /opt/landscape (docker-compose project) and
# routed by a Traefik docker-label (priority 100). Deployment is therefore:
#
#   1. (gate) validate the data + optionally run the unit test suite
#   2. git pull --ff-only the latest main into the checkout
#   3. tag the current image as :previous (instant rollback)
#   4. docker compose build && docker compose up -d
#   5. verify the live site (HTTP, service count, World-Office, logos)
#
# Usage:
#   bash scripts/deploy-landscape.sh                 # run on the prod host
#   DEPLOY_HOST=root@178.254.2.90 bash scripts/deploy-landscape.sh   # from a dev machine
#
# Knobs (env):
#   DEPLOY_HOST   ssh target — run this script remotely on the prod host
#   CHECKOUT      repo dir to deploy (default: /opt/landscape)
#   SKIP_PULL=1   deploy the current checkout without git pull
#   RUN_TESTS=1   run the full vitest unit suite before deploying (needs node/npm)
#   DRY_RUN=1     print what would happen without changing anything
#   SITE_URL      verification URL (default https://landscape.opendesk-edu.org)

set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
SITE_URL="${SITE_URL:-https://landscape.opendesk-edu.org}"
CONTAINER="landscape-opendesk-edu"
IMAGE="landscape-opendesk-edu:latest"
CHECKOUT="${CHECKOUT:-/opt/landscape}"
EXPECTED_SERVICES="${EXPECTED_SERVICES:-109}"

ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; exit 1; }

# --- remote mode: run this very script on the prod host ---------------------
if [ -n "${DEPLOY_HOST:-}" ]; then
    echo -e "${GREEN}=== Deploying via ${DEPLOY_HOST} ===${NC}"
    scp -q "$0" "$DEPLOY_HOST:/tmp/deploy-landscape.sh"
    # shellcheck disable=SC2029
    ssh "$DEPLOY_HOST" "CHECKOUT=${CHECKOUT} SITE_URL=${SITE_URL} SKIP_PULL=${SKIP_PULL:-} RUN_TESTS=${RUN_TESTS:-} DRY_RUN=${DRY_RUN:-} EXPECTED_SERVICES=${EXPECTED_SERVICES} bash /tmp/deploy-landscape.sh"
    RC=$?
    ssh "$DEPLOY_HOST" "rm -f /tmp/deploy-landscape.sh" 2>/dev/null || true
    exit $RC
fi

echo -e "${GREEN}=== landscape.opendesk-edu.org Deployment ===${NC}"
echo ""

# --- prerequisites ----------------------------------------------------------
echo -e "${YELLOW}→ Checking prerequisites...${NC}"
for cmd in docker git curl; do
    command -v "$cmd" >/dev/null 2>&1 || fail "required command not found: $cmd"
done
docker compose version >/dev/null 2>&1 || fail "docker compose plugin not available"
[ -d "$CHECKOUT" ] || fail "checkout not found: $CHECKOUT"
[ -f "$CHECKOUT/index.html" ] || fail "index.html not found in $CHECKOUT"
[ -f "$CHECKOUT/docker-compose.yml" ] || fail "docker-compose.yml not found in $CHECKOUT"
cd "$CHECKOUT"
ok "prerequisites met ($CHECKOUT)"

# --- git: tolerate dubious-ownership (repo owned by another user) -----------
if ! git rev-parse --git-dir >/dev/null 2>&1; then
    git config --global --add safe.directory "$CHECKOUT"
fi

if ! git rev-parse HEAD >/dev/null 2>&1; then
    fail "not a git repository: $CHECKOUT"
fi

# --- pre-deploy gate ---------------------------------------------------------
echo -e "${YELLOW}→ Pre-deploy gate...${NC}"
if command -v node >/dev/null 2>&1 && [ -f "$CHECKOUT/scripts/generate-data.js" ]; then
    if [ ! -d "$CHECKOUT/node_modules" ]; then
        (cd "$CHECKOUT" && npm ci --silent >/dev/null 2>&1) || warn "npm ci failed (offline?) — skipping data validation"
    fi
    (cd "$CHECKOUT" && node scripts/generate-data.js >/dev/null 2>&1) || fail "data validation failed (scripts/generate-data.js)"
    ok "data validates (YAML -> JS)"
    if [ "${RUN_TESTS:-}" = "1" ] && [ -f "$CHECKOUT/package.json" ]; then
        echo -e "  ${YELLOW}→ Running unit test suite (RUN_TESTS=1)...${NC}"
        (cd "$CHECKOUT" && npm run test:unit) || fail "unit tests failed — refusing to deploy"
        ok "unit tests passed"
    fi
else
    warn "node not available — skipping data validation gate (CI covers it)"
fi

# --- pull latest -------------------------------------------------------------
echo -e "${YELLOW}→ Updating checkout...${NC}"
if [ "${SKIP_PULL:-}" = "1" ]; then
    warn "SKIP_PULL=1 — deploying current checkout"
else
    git fetch origin main >/dev/null 2>&1 || warn "git fetch failed — deploying current checkout"
    if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main 2>/dev/null || echo HEAD)" ]; then
        LOCAL_CHANGES="$(git status --porcelain | wc -l)"
        if [ "$LOCAL_CHANGES" -ne 0 ]; then
            fail "local changes in $CHECKOUT block fast-forward — run 'git status' and commit/stash first"
        fi
        git pull --ff-only origin main || fail "git pull failed — fix the checkout first"
        ok "pulled $(git rev-parse --short HEAD)"
    else
        ok "already at latest ($(git rev-parse --short HEAD))"
    fi
fi

# --- rollback safety ----------------------------------------------------------
echo -e "${YELLOW}→ Image management...${NC}"
if [ "${DRY_RUN:-}" = "1" ]; then
    warn "DRY_RUN=1 — stopping before build"
    echo -e "${GREEN}=== DRY RUN COMPLETE (nothing changed) ===${NC}"
    exit 0
fi
if docker image inspect "$IMAGE" >/dev/null 2>&1; then
    docker tag "$IMAGE" landscape-opendesk-edu:previous
    ok "previous image preserved as landscape-opendesk-edu:previous"
fi

# --- build + deploy -----------------------------------------------------------
echo -e "${YELLOW}→ Building and deploying...${NC}"
docker compose build || fail "docker compose build failed"
docker compose up -d || fail "docker compose up failed"
ok "container started"

# --- wait for readiness --------------------------------------------------------
echo -e "${YELLOW}→ Waiting for the site to come up...${NC}"
for i in $(seq 1 30); do
    if curl -sf -o /dev/null "$SITE_URL/"; then
        ok "site responded after ${i}s"
        break
    fi
    if [ "$i" -eq 30 ]; then
        fail "site did not respond within 30s — rollback: docker compose up -d with :previous"
    fi
    sleep 1
done

# --- verification ----------------------------------------------------------------
echo -e "${YELLOW}→ Verifying deployment...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL/" 2>/dev/null || echo 000)
if [ "$HTTP_STATUS" = "200" ]; then
    ok "HTTPS endpoint returns 200"
else
    fail "HTTPS endpoint returned $HTTP_STATUS"
fi

COUNT=$(curl -s "$SITE_URL/data/services.js" 2>/dev/null | grep -o '"total_services": [0-9]*' | grep -o '[0-9]*' | head -1)
if [ -n "$COUNT" ] && [ "$COUNT" -ge "$EXPECTED_SERVICES" ]; then
    ok "live service count: $COUNT (expected >= $EXPECTED_SERVICES)"
else
    fail "service count mismatch: got '$COUNT', expected >= $EXPECTED_SERVICES"
fi

if curl -s "$SITE_URL/data/services.js" 2>/dev/null | grep -q "World-Office"; then
    ok "World-Office present"
else
    fail "World-Office missing from live data"
fi

if curl -s "$SITE_URL/data/services.js" 2>/dev/null | grep -qi onlyoffice; then
    fail "ONLYOFFICE references leaked into live data"
else
    ok "no ONLYOFFICE references"
fi

LOGO_OK=0; LOGO_FAIL=0
for logo in kubernetes.svg world-office.svg gitlab.png helm.svg; do
    if curl -sf -o /dev/null "$SITE_URL/hosted_logos/$logo"; then
        LOGO_OK=$((LOGO_OK+1))
    else
        LOGO_FAIL=$((LOGO_FAIL+1))
        warn "logo 404: hosted_logos/$logo"
    fi
done
if [ "$LOGO_FAIL" -eq 0 ]; then
    ok "spot-checked logos serve (${LOGO_OK}/4)"
else
    warn "logo issues: ${LOGO_FAIL} failed"
fi

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "🌄 $SITE_URL is live with $COUNT services"
echo ""
echo "Useful commands:"
echo "  - Rollback:          docker tag landscape-opendesk-edu:previous landscape-opendesk-edu:latest && docker compose up -d"
echo "  - Container logs:    docker logs $CONTAINER --tail 50"
echo "  - Redeploy (host):   bash /opt/landscape/scripts/deploy-landscape.sh"
echo "  - Redeploy (remote): DEPLOY_HOST=root@178.254.2.90 bash scripts/deploy-landscape.sh"
echo ""
