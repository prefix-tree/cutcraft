#!/usr/bin/env bash
# The export's golden stills, run on Linux amd64 in Docker the way CI runs them. Goldens are drawn on CI's Linux
# (SwiftShader WebGL, FreeType text), so they do not match a Mac's pixels; this checks them, or redraws them, from any
# machine with Docker. Emulated on Apple silicon: a first run takes several minutes, later runs reuse the caches.
#
#   scripts/goldens-linux.sh            check the goldens
#   scripts/goldens-linux.sh --update   redraw them into packages/render/test/goldens
#
# Stills that drift land in packages/render/test/.tmp/goldens-actual, as on CI.
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
update=0
[[ "${1:-}" == "--update" ]] && update=1
mkdir -p "${repo}/packages/render/test/.tmp/goldens-actual"

docker run --rm --platform linux/amd64 \
  -e CUTCRAFT_UPDATE_GOLDENS="${update}" \
  -v "${repo}:/src:ro" \
  -v "${repo}/packages/render/test/goldens:/goldens" \
  -v "${repo}/packages/render/test/.tmp/goldens-actual:/actual" \
  -v cutcraft-goldens-pnpm:/root/.local/share/pnpm \
  -v cutcraft-goldens-chrome:/root/.cache/cutcraft \
  node:22-bookworm bash -euo pipefail -c '
    apt-get update -qq && apt-get install -y -qq ffmpeg rsync >/dev/null
    rsync -a --exclude node_modules --exclude .tmp /src/ /work/
    cd /work
    corepack enable && pnpm install --frozen-lockfile --reporter=silent
    pnpm --filter @cutcraft/player exec playwright install-deps chromium >/dev/null
    pnpm --filter @cutcraft/render exec tsx src/cli.ts browser install
    cd packages/render
    status=0
    npx vitest run -c vitest.browser.config.ts test/browser/goldens.test.ts || status=$?
    cp -r test/.tmp/goldens-actual/. /actual/ 2>/dev/null || true
    if [ "$CUTCRAFT_UPDATE_GOLDENS" = 1 ]; then cp test/goldens/*.png /goldens/; fi
    exit $status
  '
