#!/usr/bin/env bash
# Deploy the static site to designwithjazz.com (CyberPanel/OneClickHost).
#
# Usage:
#   ./scripts/deploy.sh           # actually deploys
#   ./scripts/deploy.sh --dry-run # lists files that would be uploaded
#
# Approach:
#   - Auto-stamps a fresh cache-bust token (current git short SHA) into
#     index.html's CSS/JS <link>/<script> ?v=... query strings, so every
#     deploy yields a new URL for the assets and clients fetch fresh
#     files automatically. No manual cache-bumping needed.
#   - Streams a gzipped tarball over a single SSH session and untars it
#     directly into the web root. One SSH connection, gzip on the wire,
#     no rsync dependency required.
#
# Caveats:
#   - Does NOT delete orphaned files on the server (tar only adds/overwrites).
#     If you remove a file locally, also delete it on the server manually
#     or do a one-time `ssh jasmine-deploy "rm -rf .../public_html/*"` first.
#   - Not atomic mid-deploy - if interrupted, you may have a partial state.
#     Fine for a portfolio; harden later if traffic warrants it.
#   - The cache-bust step modifies index.html on disk, then restores it
#     from a backup on exit (even if interrupted). The repo's index.html
#     keeps a stable ?v=... token; only the deployed copy is freshly
#     stamped.
#
# Requires:
#   - The "jasmine-deploy" SSH alias from ~/.ssh/config
#   - tar + ssh + sed (all ship with Git Bash and every Unix)

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

PAYLOAD=(.htaccess robots.txt sitemap.xml index.html
         favicon.svg favicon.ico favicon-32.png favicon-192.png apple-touch-icon.png
         css js images fonts)

# Cache-bust token. Prefer the current git short SHA so every commit
# gets a unique token; fall back to a unix timestamp if git isn't
# available for any reason.
VERSION="$(git rev-parse --short HEAD 2>/dev/null || date +%s)"

if [ "${1:-}" = "--dry-run" ]; then
    echo ""
    echo "→ DRY-RUN - files that would be uploaded:"
    echo "  Cache-bust token would be: ?v=$VERSION"
    echo ""
    tar "${EXCLUDES[@]}" -cvf /dev/null "${PAYLOAD[@]}" 2>&1 | sed 's/^/  /'
    echo ""
    echo "(re-run without --dry-run to actually deploy)"
    exit 0
fi

echo ""
echo "→ Deploying to $REMOTE_ALIAS:$REMOTE_PATH"
echo "  Cache-bust token: ?v=$VERSION"
echo "  Streaming tarball over SSH..."
echo ""

# Stamp the version into index.html (with a backup so we always restore
# on exit, even if ssh dies mid-stream). This way the file in the repo
# stays at whatever ?v=... it was committed with, but the deployed copy
# always carries the current SHA. Same approach for CSS/JS minification:
# minified copies live under .deploy/ and are restored on exit.
mkdir -p .deploy
cp index.html .deploy/index.html.bak
cp css/styles.css .deploy/styles.css.bak
cp js/main.js    .deploy/main.js.bak
trap 'mv -f .deploy/index.html.bak  index.html      2>/dev/null || true;
      mv -f .deploy/styles.css.bak  css/styles.css  2>/dev/null || true;
      mv -f .deploy/main.js.bak     js/main.js      2>/dev/null || true;
      rm -rf .deploy 2>/dev/null || true' EXIT

sed -i.tmp -E "s|(styles\.css\?v=)[^\"']+|\1$VERSION|g; s|(main\.js\?v=)[^\"']+|\1$VERSION|g" index.html
rm -f index.html.tmp

# Minify CSS + JS in place via a small Node pass. Source files are
# restored on exit (above) so the repo isn't touched. Saves ~30-40%
# on top of gzip - small but measurable on slow 4G.
node -e "
const fs = require('fs');
// CSS minify: drop comments, collapse whitespace, tighten around
// { } : ; , > ~ . Caveats:
// - Don't touch + or -: CSS spec REQUIRES whitespace around them
//   inside calc() expressions. calc(50% + 70px) must NOT become
//   calc(50%+70px) (invalid; declaration silently dropped).
// - Whitespace inside quoted strings is significant (attribute
//   selectors like [style*=\"text-align: center\"], content:\"foo : bar\",
//   url(\"...\")). We mask strings before stripping whitespace, then
//   restore them. Hand-rolled minifiers without this step quietly
//   break selectors.
let css = fs.readFileSync('css/styles.css', 'utf8');
const __strs = [];
css = css.replace(/(\"[^\"]*\"|'[^']*')/g, (m) => {
  __strs.push(m);
  return '__CSSSTR' + (__strs.length - 1) + '__';
});
css = css
  .replace(/\\/\\*[\\s\\S]*?\\*\\//g, '')
  .replace(/\\s+/g, ' ')
  .replace(/\\s*([{}:;,>~])\\s*/g, '\\\$1')
  .replace(/;}/g, '}')
  .trim();
css = css.replace(/__CSSSTR(\\d+)__/g, (_, i) => __strs[+i]);
fs.writeFileSync('css/styles.css', css);
// JS: drop // line comments and /* block */ comments, collapse whitespace
// (kept conservative - only safe transforms, no identifier renaming)
let js = fs.readFileSync('js/main.js', 'utf8');
js = js
  .replace(/\\/\\*[\\s\\S]*?\\*\\//g, '')
  .replace(/^\\s*\\/\\/[^\\n]*\$/gm, '')
  .replace(/\\n\\s*\\n/g, '\\n')
  .trim();
fs.writeFileSync('js/main.js', js);
console.log('  Minified CSS + JS for deploy');
"

tar "${EXCLUDES[@]}" -czf - "${PAYLOAD[@]}" \
    | ssh "$REMOTE_ALIAS" "tar -xzf - -C '$REMOTE_PATH' && \
        find '$REMOTE_PATH' -type f -exec chmod 644 {} + && \
        find '$REMOTE_PATH' -type d -exec chmod 755 {} +"

echo ""
echo "✓ Deployed. Visit https://designwithjazz.com"
