import { createServer } from "node:http";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";

// log level via WISP_LOG_LEVEL (debug|info|warn|error). default info logs every stream
// open + refusal — what you want for egress troubleshooting. journald captures it.
const LEVELS = {
  debug: logging.DEBUG,
  info: logging.INFO,
  warn: logging.WARN,
  error: logging.ERROR,
};
logging.set_level(LEVELS[process.env.WISP_LOG_LEVEL?.toLowerCase()] ?? logging.INFO);

// network egress for the proxy (this host makes the outbound requests). wisp-js
// blocks loopback + private + link-local (incl. 169.254.169.254 metadata) on the
// RESOLVED ip by default, so internal targets are already unreachable. we keep those
// defaults and harden the public-relay surface: tcp-only, http/https ports, stream caps.
Object.assign(wisp.options, {
  allow_udp_streams: false,
  allow_tcp_streams: true,
  port_whitelist: [80, 443],
  stream_limit_total: 256, // per wisp connection; anti-abuse cap, tune if heavy sites stall
  // stream_limit_per_host left default (-1): wisp-js 0.4.1 iterates connection.streams
  // (a plain object) with for...of in that path and throws "not iterable", crashing the process.
});

// bind to loopback so only the local nginx (TLS terminator) can reach it in prod.
const HOST = process.env.WISP_HOST || "127.0.0.1";
const PORT = Number(process.env.WISP_PORT) || 4000;

const httpServer = createServer((_req, res) => {
  res.writeHead(200);
  res.end("wisp up");
});
httpServer.on("upgrade", (req, socket, head) => {
  if (req.url?.endsWith("/wisp/")) wisp.routeRequest(req, socket, head);
  else socket.destroy();
});
httpServer.listen(PORT, HOST, () => console.log(`wisp on ws://${HOST}:${PORT}/wisp/`));
