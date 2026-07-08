import { Info } from "lucide-react";

export function DesktopOnlyCallout() {
  return (
    <div className="mx-3 mb-3 flex gap-2.5 rounded-xl bg-muted px-3 py-2.5 text-sm text-muted-foreground">
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p>Screen recording is available on desktop only.</p>
    </div>
  );
}
