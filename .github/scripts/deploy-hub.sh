#!/usr/bin/env bash
#
# Deploys the hub to the VPS.
#
# WHY THE BUILD DOES NOT GO STRAIGHT INTO dist
#   nginx serves one directory — frontend-hub/dist — for all six subdomains:
#   admin, collections, apply, agent, report and finance. apply is the one
#   customers use to take a loan. `vite build` empties its output directory
#   first, so building over dist takes every one of those down for the minute
#   the build runs. Instead this builds into dist-new and swaps with two
#   renames, which is as close to atomic as a directory gets.
#
# WHY IT ROLLS BACK BY ITSELF
#   The swap is two renames, so undoing it is two more. There is no reason to
#   leave a broken build serving customers while someone reads a log: if the
#   subdomains do not answer afterwards, this puts the previous one back and
#   then fails.
#
# WHY THE LOGIC IS IN A FILE
#   The deploy action feeds its inline script to the remote login shell, which
#   on this box is zsh, and a parse error there rejects the whole block before a
#   single line runs — reported as a line number matching nothing in the
#   workflow. Under an explicit bash, and in a file, `bash -n` and shellcheck
#   can see this before it reaches production.
set -euo pipefail

APP_PATH="${1:?app path required}"
# Checked over HTTPS after the swap. apply is first on purpose: it is the one
# customers are using right now.
HOSTS=(apply.agendamoney.com admin.agendamoney.com collections.agendamoney.com)
# Rollback copies to keep. Enough to go back a couple of deploys, few enough
# that a 12MB build does not quietly fill the disk.
KEEP_BACKUPS=3

cd "$APP_PATH"

# The workflow has already fetched and reset to origin/main before invoking
# this, so that a change to this file takes effect on the run that introduces it
# rather than the one after.
echo "[Hub] building $(git rev-parse --short HEAD)"

# .env holds the build-time VITE_ values and is not in git. Losing it would
# produce a build pointing at nothing, so fail here rather than serve that.
[ -f .env ] || { echo "[Hub] ERROR: no .env in $APP_PATH — the build would have no API URL"; exit 1; }

npm ci

rm -rf dist-new
npx vite build --outDir dist-new --emptyOutDir
[ -f dist-new/index.html ] || { echo "[Hub] ERROR: build produced no index.html"; exit 1; }

TS="$(date +%Y%m%d-%H%M%S)"
BACKUP="dist-old-$TS"
mv dist "$BACKUP"
mv dist-new dist
echo "[Hub] swapped in the new build, previous kept at $BACKUP"

# Verify, and put the old one back if it did not work. A static site either
# answers or it does not, so there is nothing to be gained by leaving a broken
# build up while someone investigates.
failed=""
for host in "${HOSTS[@]}"; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "https://$host/" || echo 000)"
  echo "[Hub] $host -> $code"
  [ "$code" = "200" ] || failed="$failed $host"
done

if [ -n "$failed" ]; then
  echo "[Hub] ERROR: not serving:$failed — rolling back"
  rm -rf dist-failed-"$TS"
  mv dist dist-failed-"$TS"
  mv "$BACKUP" dist
  echo "[Hub] rolled back. The failed build is at dist-failed-$TS for inspection."
  exit 1
fi

# Keep a few, drop the rest. Sorted by name, which is chronological because the
# suffix is a timestamp.
ls -1d dist-old-* 2>/dev/null | sort -r | tail -n +$((KEEP_BACKUPS + 1)) | while read -r old; do
  echo "[Hub] pruning $old"
  rm -rf "$old"
done

echo "[Hub] deployed $(git rev-parse --short HEAD)"
