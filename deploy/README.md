# Wisp egress server

The Scramjet proxy needs a Wisp server to make the outbound requests (browsers can't open raw sockets). It can't run on Vercel (no persistent WebSocket), so it runs on an always-on host behind nginx TLS.

Example host **`wisp.example.com`**: wisp on `127.0.0.1:4000`, nginx terminates TLS and proxies `wss://wisp.example.com/wisp/` to it. Replace with your real hostname, SSH user, and paths.

App release / promotion flow (dev → main, Release Please): [RELEASE.md](./RELEASE.md). Branch rules: [BRANCH-PROTECTION.md](./BRANCH-PROTECTION.md). Incidents: [RUNBOOK.md](./RUNBOOK.md). Public MDX docs/changelog: deferred — [`docs/prd/07-mdx-docs-and-changelog.md`](../docs/prd/07-mdx-docs-and-changelog.md).

```
browser ──wss──> nginx (:443 TLS) ──> 127.0.0.1:4000 (wisp) ──> internet
```

## Security

- wisp-js 0.4.1 blocks loopback / private / link-local (incl. `169.254.169.254` metadata) on the **resolved** ip by default — internal targets unreachable, DNS-rebinding covered. Pinned exactly so the defaults can't drift.
- `wisp-server.mjs` adds: TCP-only, ports 80/443, stream caps, loopback bind.
- nginx adds a per-ip connection cap. Origin allowlist in `nginx-wisp.conf` permits `hudxyz.com` + `*.vercel.app` (`hudxyz.com` still allowed, deprecated).
- Still a relay to arbitrary **public** http(s) sites — inherent to the feature.

## Deploy

**1. Node** (skip if present): NodeSource 22; note `which node` for the unit.

**2. App**

```sh
ssh deploy@wisp.example.com 'mkdir -p ~/wisp'
scp apps/web/scripts/wisp-server.mjs deploy/wisp/package.json deploy@wisp.example.com:~/wisp/
ssh deploy@wisp.example.com 'cd ~/wisp && npm install'
```

**3. systemd** — edit `wisp.service` for the box (`User`, paths, `which node`), then:

```sh
sudo cp deploy/wisp.service /etc/systemd/system/wisp.service
sudo systemctl daemon-reload && sudo systemctl enable --now wisp
curl -s 127.0.0.1:4000        # -> wisp up
```

**4. nginx** (host already has TLS via certbot) — from `nginx-wisp.conf`: put the `map` + `limit_conn_zone` in `/etc/nginx/conf.d/wisp-map.conf`, add the `location /wisp/` to the 443 server block, then:

```sh
sudo nginx -t && sudo systemctl reload nginx
curl -s https://wisp.example.com/wisp/    # -> wisp up
# full ws path:
curl -s -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  https://wisp.example.com/wisp/ | head -1    # -> HTTP/1.1 101 Switching Protocols
```

**5. App env** — Vercel: `NEXT_PUBLIC_WISP_URL=wss://wisp.example.com/wisp/`, then redeploy (`NEXT_PUBLIC_` is build-time).

## Healthcheck (healthchecks.io)

Push from the wisp host — checks local wisp (no nginx Origin header needed). If the ping stops, healthchecks emails you.

**1. healthchecks.io** — check name `hudxyz`, period **1 min**, grace **5 min** (tune to taste).

**2. On the wisp host**

```sh
scp deploy/wisp-healthcheck.sh deploy@wisp.example.com:~/wisp/
ssh deploy@wisp.example.com 'chmod +x ~/wisp/wisp-healthcheck.sh'
```

**3. Cron** (as `deploy`, `crontab -e`)

```cron
* * * * * HC_PING_URL=https://hc-ping.com/<ping-key>/hudxyz /home/deploy/wisp/wisp-healthcheck.sh
```

**4. Test**

```sh
HC_PING_URL=https://hc-ping.com/<ping-key>/hudxyz ~/wisp/wisp-healthcheck.sh
```

Confirm the check flips green on healthchecks.io. Stop wisp briefly (`sudo systemctl stop wisp`) and wait past grace to verify alert, then `start` again.

## Logs

wisp logs to stdout → journald (timestamped), INFO by default — every stream open + refusal. Set `WISP_LOG_LEVEL=debug` in the unit for more.

```sh
journalctl -u wisp -f                  # live
journalctl -u wisp --since today       # by day
sudo mkdir -p /var/log/journal && sudo systemctl restart systemd-journald   # persist across reboots
```

Daily files in `/var/log/wisp/` (previous day's journal, 30-day retention):

```sh
sudo cp deploy/wisp-log-export.service deploy/wisp-log-export.timer /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now wisp-log-export.timer
sudo systemctl start wisp-log-export.service    # seed one now
ls /var/log/wisp/
```

## Update / re-verify

After editing `wisp-server.mjs` or the unit:

```sh
scp apps/web/scripts/wisp-server.mjs deploy@wisp.example.com:~/wisp/
sudo cp deploy/wisp.service /etc/systemd/system/wisp.service   # only if the unit changed
sudo systemctl daemon-reload && sudo systemctl restart wisp
systemctl status wisp --no-pager && curl -s 127.0.0.1:4000     # active + wisp up
```

The unit's sandboxing is V8-safe; if the service fails to start after a change, comment the sandboxing block and re-add lines one at a time.
