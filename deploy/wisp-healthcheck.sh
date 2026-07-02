#!/bin/sh
# Push wisp liveness to healthchecks.io. Run from cron/timer on kenobi.
# HC_PING_URL=https://hc-ping.com/<ping-key>/hudxyz
set -eu

: "${HC_PING_URL:?set HC_PING_URL}"

curl -fsS --max-time 5 http://127.0.0.1:4000/ | grep -q 'wisp up'
curl -fsS -m 10 --retry 2 "$HC_PING_URL"
