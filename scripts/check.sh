#!/usr/bin/env bash
# Local CI gate. Run before every push. Mirrors .github/workflows/ci.yml.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.foundry/bin:$PATH"

if [ -d contracts/src ]; then
  echo "== contracts"
  (cd contracts && forge build >/dev/null && forge test)
fi
echo "== web"
(cd web && pnpm check && NEXT_PUBLIC_MODE=mock pnpm build >/dev/null)
echo "== ok"
