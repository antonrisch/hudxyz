# Wisp egress server

The Scramjet proxy needs a Wisp server to make the outbound requests (browsers can't open raw sockets). It can't run on Vercel (no persistent WebSocket), so it runs on an always-on host behind nginx TLS.

Live on **`kenobi.hudbox.dev`**: wisp on `127.0.0.1:4000`, nginx terminates TLS and proxies `wss://kenobi.hudbox.dev/wisp/` to it.

```
browser ──wss──> nginx (:443 TLS) ──> 127.0.0.1:4000 (wisp) ──> internet
```

## Security

- wisp-js 0.4.1 blocks loopback / private / link-local (incl. `169.254.169.254` metadata) on the **resolved** ip by default — internal targets unreachable, DNS-rebinding covered. Pinned exactly so the defaults can't drift.
- `wisp-server.mjs` adds: TCP-only, ports 80/443, stream caps, loopback bind.
- nginx adds a per-ip connection cap. Enable the Origin allowlist in `nginx-wisp.conf` once the app domain is fixed.
- Still a relay to arbitrary **public** http(s) sites — inherent to the feature.

## Deploy

**1. Node** (skip if present): NodeSource 22; note `which node` for the unit.

**2. App**
```sh
ssh anton@kenobi.hudbox.dev 'mkdir -p ~/wisp'
scp apps/web/scripts/wisp-server.mjs deploy/wisp/package.json anton@kenobi.hudbox.dev:~/wisp/
ssh anton@kenobi.hudbox.dev 'cd ~/wisp && npm install'
```

**3. systemd** — edit `wisp.service` for the box (`User`, paths, `which node`), then:
```sh
sudo cp deploy/wisp.service /etc/systemd/system/wisp.service
sudo systemctl daemon-reload && sudo systemctl enable --now wisp
curl -s 127.0.0.1:4000        # -> wisp up
```

**4. nginx** (kenobi already has TLS via certbot) — from `nginx-wisp.conf`: put the `map` + `limit_conn_zone` in `/etc/nginx/conf.d/wisp-map.conf`, add the `location /wisp/` to the 443 server block, then:
```sh
sudo nginx -t && sudo systemctl reload nginx
curl -s https://kenobi.hudbox.dev/wisp/    # -> wisp up
# full ws path:
curl -s -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  https://kenobi.hudbox.dev/wisp/ | head -1    # -> HTTP/1.1 101 Switching Protocols
```

**5. App env** — Vercel: `NEXT_PUBLIC_WISP_URL=wss://kenobi.hudbox.dev/wisp/`, then redeploy (`NEXT_PUBLIC_` is build-time).

## Update / re-verify

After editing `wisp-server.mjs` or the unit:
```sh
scp apps/web/scripts/wisp-server.mjs anton@kenobi.hudbox.dev:~/wisp/
sudo cp deploy/wisp.service /etc/systemd/system/wisp.service   # only if the unit changed
sudo systemctl daemon-reload && sudo systemctl restart wisp
systemctl status wisp --no-pager && curl -s 127.0.0.1:4000     # active + wisp up
```

The unit's sandboxing is V8-safe; if the service fails to start after a change, comment the sandboxing block and re-add lines one at a time.
