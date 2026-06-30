import { readFile } from "node:fs/promises";
import { join } from "node:path";

const DIR = join(process.cwd(), "app/apps/snake");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path: segments = [] } = await params;
  const file = segments.length === 0 ? "index.html" : segments.join("/");

  if (file.includes("..") || file.startsWith("/")) {
    return new Response("Not found", { status: 404 });
  }

  const ext = file.includes(".") ? file.slice(file.lastIndexOf(".")) : "";
  const body = await readFile(join(DIR, file), "utf-8").catch(() => null);
  if (!body) return new Response("Not found", { status: 404 });

  return new Response(body, {
    headers: { "Content-Type": MIME[ext] ?? "text/plain; charset=utf-8" },
  });
}
