import type { Metadata } from "next";
import Emulator from "@/components/emulator";

export const metadata: Metadata = {
  title: "Browser — Hudbox",
  description: "Large debug view of the glasses display emulator.",
};

export default function BrowserPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-white">
      <Emulator chrome="bare" />
    </main>
  );
}
