#!/usr/bin/env bash
# Deploy the static site to designwithjazz.com (CyberPanel/OneClickHost).
#
# Usage:
#   ./scripts/deploy.sh           # actually deploys
#   ./scripts/deploy.sh --dry-run # lists files that would be uploaded
#
# Approach:
#   Pipes a compressed tar stream of (index.html + css/ + js/ + images/)
#   over a single SSH session and untars it directly into the web root.
#   One SSH connection, gzip on the wire, no rsync dependency required.
#
# Caveats:
#   - Does NOT delete orphaned files on the server (tar only adds/overwrites).
#     If you remove a file locally, also delete it on the server manually
#     or do a one-time `ssh jasmine-deploy "rm -rf .../public_html/*"` first.
#   - Not atomic mid-deploy — if interrupted, you may have a partial state.
#     Fine for a portfolio; harden later if traffic warrants it.
#
# Requires:
#   - The "jasmine-deploy" SSH alias from ~/.ssh/config
#   - tar + ssh (both ship with Git Bash and every Unix)

set -euo pipefail

REMOTE_ALIAS="jasmine-deploy"
REMOTE_PATH="/home/www.designwithjazz.com/public_html"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

EXCLUDES=(
    --exclude='.DS_Store'
    --exclude='Thumbs.db'
    --exclude='*.swp'
    --exclude='Selected visual'
)

if [ "${1:-}" = "--dry-run" ]; then
    echo ""
    echo "→ DRY-RUN — files that would be uploaded:"
    echo ""
    tar "${EXCLUDES[@]}" -cvf /dev/null .htaccess index.html css js images fonts 2>&1 | sed 's/^/  /'
    echo ""
    echo "(re-run without --dry-run to actually deploy)"
    exit 0
fi

echo ""
echo "→ Deploying to $REMOTE_ALIAS:$REMOTE_PATH"
echo "  Streaming tarball over SSH..."
echo ""

tar "${EXCLUDES[@]}" -czf - .htaccess index.html css js images fonts \
    | ssh "$REMOTE_ALIAS" "tar -xzf - -C '$REMOTE_PATH' && \
        find '$REMOTE_PATH' -type f -exec chmod 644 {} + && \
        find '$REMOTE_PATH' -type d -exec chmod 755 {} +"

echo ""
echo "✓ Deployed. Visit https://designwithjazz.com"
