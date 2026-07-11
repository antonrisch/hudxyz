import { DIRECTORY_MAILTO } from "@/lib/simulator/config";

export function ListingsEmpty() {
  return (
    <div className="py-16 text-center">
      <p className="text-muted-foreground">No published apps yet.</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Building for smart glasses?{" "}
        <a href={DIRECTORY_MAILTO} className="underline underline-offset-4 hover:text-foreground">
          Submit an app
        </a>
      </p>
    </div>
  );
}
