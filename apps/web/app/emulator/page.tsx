import type { Metadata } from "next";
import Emulator from "@/components/emulator";

export const metadata: Metadata = {
  title: "Emulator",
  description: "hud.xyz glasses display emulator.",
};

export default function EmulatorPage() {
  return (
    <main className="flex flex-1 flex-col bg-white">
      <Emulator />
    </main>
  );
}
