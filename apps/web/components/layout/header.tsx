import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 h-(--header-h) border-b bg-background">
      {/* full-bleed bar; contents constrained + centered on wide screens */}
      <div className="grid h-full grid-cols-3 items-center px-3">
        <Link href="/" className="justify-self-start">
          <Logo />
        </Link>

        <nav className="justify-self-center">
          <Link href="/emulator" className={buttonVariants({ variant: "link" })}>
            Emulator
          </Link>
        </nav>

        <Button className="justify-self-end">Share</Button>
      </div>
    </header>
  );
}
