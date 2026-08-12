#!/bin/bash
# SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
# SPDX-License-Identifier: Apache-2.0
#
# Fetches service logos from official sources into hosted_logos/
# Usage: bash scripts/fetch-logos.sh
#
# Overwrite existing logos: LOGO_FORCE=1 bash scripts/fetch-logos.sh

set -euo pipefail

cd "$(dirname "$0")/../hosted_logos"

FORCE="${LOGO_FORCE:-}"
WGET_OPTS="-q"
[ -n "$FORCE" ] && WGET_OPTS="$WGET_OPTS -N" || WGET_OPTS="$WGET_OPTS --no-clobber"

echo "=== Fetching service logos ==="

# Map of filename -> URL
declare -A LOGOS
LOGOS=(
  # Operations
  ["prometheus.svg"]="https://raw.githubusercontent.com/prometheus/prometheus/refs/heads/main/web/ui/static/img/prometheus-logo.svg"
  ["grafana.svg"]="https://raw.githubusercontent.com/grafana/grafana/main/public/img/grafana_icon.svg"
  ["loki.png"]="https://raw.githubusercontent.com/grafana/loki/main/docs/sources/logo.png"
  ["traefik.svg"]="https://raw.githubusercontent.com/traefik/traefik/v3.3/docs/content/assets/img/traefik.logo.svg"
  ["docker.png"]="https://raw.githubusercontent.com/docker/compose/main/logo.png"
  ["harbor.svg"]="https://raw.githubusercontent.com/goharbor/harbor/main/src/portal/src/images/harbor-logo.svg"
  ["uptime-kuma.svg"]="https://raw.githubusercontent.com/louislam/uptime-kuma/master/public/icon.svg"
  ["argo-cd.svg"]="https://raw.githubusercontent.com/cncf/artwork/main/projects/argo/icon/color/argo-icon-color.svg"
  ["cert-manager.svg"]="https://raw.githubusercontent.com/cncf/artwork/main/projects/cert-manager/icon/color/cert-manager-icon-color.svg"
  ["kubernetes.svg"]="https://raw.githubusercontent.com/cncf/artwork/main/projects/kubernetes/icon/color/kubernetes-icon-color.svg"
  ["helm.svg"]="https://raw.githubusercontent.com/cncf/artwork/main/projects/helm/icon/color/helm-icon-color.svg"
  ["velero.svg"]="https://raw.githubusercontent.com/cncf/artwork/main/projects/velero/icon/color/velero-icon-color.svg"
  ["trivy.png"]="https://raw.githubusercontent.com/aquasecurity/trivy/main/docs/imgs/logo.png"
  # Identity
  ["keycloak.svg"]="https://www.keycloak.org/resources/images/logo.svg"
  # LMS
  ["moodle.svg"]="https://raw.githubusercontent.com/moodle/moodle/main/pix/moodlelogo.svg"
  ["jitsi.svg"]="https://raw.githubusercontent.com/jitsi/jitsi-meet/master/images/jitsi-logo.svg"
  # Collaboration
  ["nextcloud.svg"]="https://raw.githubusercontent.com/nextcloud/server/main/core/img/logo/logo.svg"
  ["etherpad.svg"]="https://raw.githubusercontent.com/ether/etherpad-lite/master/src/static/images/etherpad.svg"
  ["mediawiki.png"]="https://www.mediawiki.org/static/images/project-logos/mediawikiwiki.png"
  ["dokuwiki.png"]="https://www.dokuwiki.org/lib/exe/fetch.php?media=wiki:dokuwiki-128.png"
  # Communication
  ["element.svg"]="https://raw.githubusercontent.com/element-hq/element-web/master/images/element-logo.svg"
  ["mattermost.svg"]="https://raw.githubusercontent.com/mattermost/mattermost/master/webapp/channels/src/images/logo.svg"
  ["rocket-chat.svg"]="https://raw.githubusercontent.com/RocketChat/Rocket.Chat/develop/apps/meteor/public/images/logo/logo.svg"
  ["owncast.svg"]="https://raw.githubusercontent.com/owncast/owncast/develop/web/static/logo.svg"
  # Media
  ["peertube.svg"]="https://raw.githubusercontent.com/Chocobozzz/PeerTube/master/client/src/assets/images/logo.svg"
  # Development
  ["forgejo.svg"]="https://codeberg.org/forgejo/forgejo/raw/branch/forgejo/assets/logo.svg"
  ["slidev.svg"]="https://sli.dev/logo.svg"
  ["open-webui.png"]="https://raw.githubusercontent.com/open-webui/open-webui/main/static/favicon.png"
  ["gitlab.png"]="https://about.gitlab.com/images/press/logo/png/gitlab-logo-gray-rgb.png"
  ["jenkins.png"]="https://www.jenkins.io/images/logo-title-opengraph.png"
  ["plausible.png"]="https://plausible.io/favicon.ico"
)

for filename in "${!LOGOS[@]}"; do
  url="${LOGOS[$filename]}"
  if [ -f "$filename" ] && [ -z "$FORCE" ]; then
    echo "  ⏭️  $filename already exists"
    continue
  fi
  echo "  ⬇️  $filename"
  # Try SVG first, fall back to PNG; save with correct extension
  if wget $WGET_OPTS -O "$filename" "$url" 2>/dev/null; then
    echo "    ✓ $filename"
  else
    echo "    ✗ Failed: $url"
  fi
done

echo "=== Done ==="
