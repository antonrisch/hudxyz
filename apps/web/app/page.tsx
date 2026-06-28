import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Page() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Hudbox</h1>
      <p className="max-w-md text-muted-foreground">
        Glanceable lenses for the Meta Ray-Ban Display.
      </p>
      <Link href="/emulator" className={buttonVariants()}>
        Open emulator
      </Link>
    </main>
  );
}
