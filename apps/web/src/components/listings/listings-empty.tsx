import Link from "next/link";

export function ListingsEmpty() {
  return (
    <div className="py-16 text-center">
      <p className="text-muted-foreground">No published apps yet.</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Building for smart glasses?{" "}
        <Link href="/apps/submit" className="underline underline-offset-4 hover:text-foreground">
          Submit a Web App
        </Link>
      </p>
    </div>
  );
}
