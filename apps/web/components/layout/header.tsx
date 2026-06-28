import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 h-13 border-b bg-background">
      {/* full-bleed bar; contents constrained + centered on wide screens */}
      <div className="mx-auto grid h-full max-w-7xl grid-cols-3 items-center px-4">
        <Link href="/" className="justify-self-start">
          <Logo />
        </Link>

        <nav className="justify-self-center">
          <Link href="/emulator" className={buttonVariants({ variant: "ghost" })}>
            Emulator
          </Link>
        </nav>

        <Button className="justify-self-end">Share</Button>
      </div>
    </header>
  );
}
