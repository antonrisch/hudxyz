# Production runbook

Solo-operator incident response for hud.xyz. DNS lives on **Bunny**; the Next app on **Vercel**; Wisp egress on **Hetzner** (`kenobi.hudbox.dev`).

## Architecture

```
Browser ──HTTPS──> hud.xyz (Vercel / Next.js)
                 └── wss ──> kenobi.hudbox.dev (nginx) ──> wisp (:4000) ──> internet
```

## Severity guide

| Level  | Examples                                               | Response                                   |
| ------ | ------------------------------------------------------ | ------------------------------------------ |
| **P0** | hud.xyz down, proxy used for abuse at scale, data leak | Drop everything; fix or rollback within 1h |
| **P1** | Simulator broken but site loads, elevated Sentry errors | Fix same day                               |
| **P2** | Cosmetic bug, single-user report                       | Next deploy window                         |

## Escalation

Solo dev — you are L1/L2/L3.

1. Check [Vercel Status](https://www.vercel-status.com) and Hetzner status.
2. Open Sentry → filter `environment:production`, last 1h.
3. If Wisp-related: `ssh anton@kenobi.hudbox.dev` and check wisp (below).

## Rollback — Vercel (app)

Fastest path when a bad deploy shipped:

1. Vercel → **Project** → **Deployments**
2. Find last known-good production deployment → **⋯** → **Instant Rollback**
3. Confirm `hud.xyz (/) ` loads and proxy works

`NEXT_PUBLIC_*` vars are **build-time**. Rolling back does not change env; if the break was a bad env change, fix env and **Redeploy** instead.

## Rollback / restart — Wisp (Hetzner)

```sh
ssh anton@kenobi.hudbox.dev
systemctl status wisp --no-pager
journalctl -u wisp -n 100 --no-pager          # recent errors / refusals
curl -s 127.0.0.1:4000                          # -> wisp up
curl -s https://kenobi.hudbox.dev/wisp/       # -> wisp up (through nginx)
```

Restart after config or script change:

```sh
# from laptop — push new script
scp apps/web/scripts/wisp-server.mjs anton@kenobi.hudbox.dev:~/wisp/
ssh anton@kenobi.hudbox.dev 'sudo systemctl restart wisp && curl -s 127.0.0.1:4000'
```

Full wisp deploy steps: [deploy/README.md](./README.md).

## Common failures

### Simulator stuck / proxy not loading

- Browser devtools → **Console** and **Network** → WebSocket to `wisp` (101 Switching Protocols?)
- Verify Vercel env: `NEXT_PUBLIC_WISP_URL=wss://kenobi.hudbox.dev/wisp/`
- Check nginx origin allowlist still permits `https://hud.xyz` and your preview host if testing previews
- `journalctl -u wisp -f` on kenobi while reproducing

### 403 on Wisp WebSocket

nginx blocks requests whose `Origin` is not `*.hud.xyz` or `*.vercel.app`. Previews on other hosts will fail by design.

### Spike in Sentry errors

- Group by issue → check if single deploy regression (rollback) or upstream site breaking in iframe
- Lower noise later: reduce `tracesSampleRate` / replay rates in Sentry config

### SSL / DNS

- **Bunny** → confirm A/CNAME for `hud.xyz` still points at Vercel
- **kenobi** TLS: `sudo certbot certificates` on the VPS if wss fails after cert renewal

## Communication

No public status page yet. For a prolonged P0:

- Post on your usual channel (if any)
- Monitor [Vercel Status](https://www.vercel-status.com)

## Post-incident

1. Note timeline + root cause in a GitHub issue or private doc
2. If abuse-driven: tighten Wisp stream caps, nginx `limit_conn`, or Vercel WAF (see [vercel-dashboard.md](./vercel-dashboard.md))
3. Redeploy fix or keep rollback until fix is verified on a preview

## Pre-launch verification (smoke)

After any production change:

- [ ] `https://hud.xyz` → redirects to `/`
- [ ] Load a public URL in the simulator (proxy path works)
- [ ] `/privacy` and `/terms` render
- [ ] Sentry test event (optional) via a thrown error on preview only
- [ ] `curl -I https://hud.xyz/privacy` shows security headers (HSTS, nosniff, etc.)
