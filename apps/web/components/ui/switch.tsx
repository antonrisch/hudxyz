"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

const thumb =
  "pointer-events-none block rounded-full bg-white ring-0 transition-transform"

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 p-0.5 transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-green-500 data-checked:bg-green-500 data-unchecked:border-input data-unchecked:bg-input dark:data-unchecked:border-input dark:data-unchecked:bg-input/80 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        size === "default" && "h-5 w-11",
        size === "sm" && "h-4 w-9",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          thumb,
          size === "default" && "h-4 w-6 data-checked:translate-x-3.5 data-unchecked:-translate-x-0.5",
          size === "sm" && "h-2.5 w-4 data-checked:translate-x-3.5 data-unchecked:translate-x-0",
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
