import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 min-w-5 shrink-0 items-center justify-center gap-1 rounded-sm bg-muted px-1 font-mono text-xs leading-none font-medium tracking-wider text-muted-foreground select-none",
        "[&_svg:not([class*='size-'])]:size-3",
        "in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10",
        className,
      )}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="kbd-group"
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-sm bg-muted px-1.5",
        "**:data-[slot=kbd]:h-auto **:data-[slot=kbd]:min-w-0 **:data-[slot=kbd]:bg-transparent **:data-[slot=kbd]:px-0",
        "[&>span]:text-[10px] [&>span]:leading-none [&>span]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd, KbdGroup };
