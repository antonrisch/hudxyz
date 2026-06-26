import type { Metadata } from "next";
import Emulator from "@/components/Emulator";

export const metadata: Metadata = {
  title: "Emulator — Lenswolf",
  description: "Lenswolf glasses display emulator.",
};

export default function EmulatorPage() {
  return (
    <main className="flex min-h-svh items-center justify-center">
      <Emulator />
    </main>
  );
}
