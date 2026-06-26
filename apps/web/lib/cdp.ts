import { chromium, type Browser, type Page } from "playwright-core";
import { connectUrlFor } from "./browserbase";

// playwright over CDP into a Browserbase session: navigate + dispatch d-pad keys
// (can't inject into the cross-origin live-view iframe). connections cached per session.

type Conn = { browser: Browser; page: Page };
const conns = new Map<string, Conn>();

async function open(sessionId: string): Promise<Conn> {
  const browser = await chromium.connectOverCDP(connectUrlFor(sessionId));
  const context = browser.contexts()[0] ?? (await browser.newContext());
  const page = context.pages()[0] ?? (await context.newPage());
  const conn = { browser, page };
  conns.set(sessionId, conn);
  return conn;
}

async function getPage(sessionId: string): Promise<Page> {
  const cached = conns.get(sessionId);
  if (cached?.browser.isConnected()) return cached.page;
  return (await open(sessionId)).page;
}

export async function navigate(sessionId: string, url: string): Promise<void> {
  const page = await getPage(sessionId);
  await page.goto(url, { waitUntil: "domcontentloaded" });
}

export async function pressKey(sessionId: string, key: string): Promise<void> {
  const page = await getPage(sessionId);
  await page.keyboard.press(key);
}

export async function disconnect(sessionId: string): Promise<void> {
  const conn = conns.get(sessionId);
  conns.delete(sessionId);
  await conn?.browser.close().catch(() => {});
}
