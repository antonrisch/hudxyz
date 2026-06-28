import { createServer } from "node:http";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";

// network egress for the proxy. SSRF protection lives here now (this host makes
// the outbound requests) — set hostname_blacklist before exposing publicly.
Object.assign(wisp.options, { allow_udp_streams: false });

const PORT = Number(process.env.WISP_PORT) || 4000;

const httpServer = createServer((_req, res) => {
  res.writeHead(200);
  res.end("wisp up");
});
httpServer.on("upgrade", (req, socket, head) => {
  if (req.url?.endsWith("/wisp/")) wisp.routeRequest(req, socket, head);
  else socket.destroy();
});
httpServer.listen(PORT, () => console.log(`wisp on ws://localhost:${PORT}/wisp/`));
