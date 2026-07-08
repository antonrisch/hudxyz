<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Buttons with icons

shadcn `Button` (`components/ui/button.tsx`) uses `data-icon` for icon + label layout. Same rules apply when composing `buttonVariants()` on other elements (e.g. links).

**Icon + text** — mark the icon, not the label:

```tsx
<Button size="lg">
  <Glasses data-icon="inline-start" />
  Open on Glasses
</Button>

<Button>
  Next
  <ArrowRight data-icon="inline-end" />
</Button>
```

- `data-icon="inline-start"` — icon before label (left in LTR)
- `data-icon="inline-end"` — icon after label (right in LTR)

The button tightens padding on the icon side via `has-data-[icon=inline-start]:pl-*` / `has-data-[icon=inline-end]:pr-*`. Do not add manual icon margins (`mr-2`, etc.).

**Icon only** — use `size="icon"` (or `icon-sm`, `icon-lg`, …). No `data-icon`.

**Icon sizing** — let the button size SVGs (`[&_svg:not([class*='size-'])]:size-4` by default). Only set `className="size-*"` on the icon when you need an exception (e.g. animation, semantic fill).
