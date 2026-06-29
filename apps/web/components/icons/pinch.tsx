import { createLucideIcon } from "lucide-react";

// custom pinch-gesture icon on the lucide base: inherits the 24×24 viewBox, currentColor
// stroke, strokeWidth, linecaps and sizing, so <Pinch /> behaves like any built-in lucide icon.
// (source path was authored for a 25×25 box but its coords fit within 24, so no clipping.)
export const Pinch = createLucideIcon("Pinch", [
  [
    "path",
    {
      d: "M15.9957 11.5C14.8197 10.912 11.9957 9 10.4957 9C8.9957 9 5.17825 11.7674 6 13C7 14.5 9.15134 11.7256 10.4957 12C11.8401 12.2744 13 13.5 13 14.5C13 15.5 11.8401 16.939 10.4957 16.5C9.15134 16.061 8.58665 14.3415 7.4957 14C6.21272 13.5984 5.05843 14.6168 5.5 15.5C5.94157 16.3832 7.10688 17.6006 8.4957 19C9.74229 20.2561 11.9957 21.5 14.9957 20C17.9957 18.5 18.5 16.2498 18.5 13C18.5 11.5 13.7332 5.36875 11.9957 4.5C10.9957 4 10 5 10.9957 6.5C11.614 7.43149 13.5 9.27705 14 10.3751M15.5 8C15.5 8 15.3707 7.5 14.9957 6C14.4957 4 15.9957 3.5 16.4957 4.5C17.1281 5.76491 18.2872 10.9147 18.4957 13",
      // center + scale the 25-box art to fill lucide's 24 grid. non-scaling-stroke keeps the
      // line weight tied to the strokeWidth prop / sibling icons. nudge scale + translate to taste.
      transform: "translate(-1.2 -1.6) scale(1.2)",
      vectorEffect: "non-scaling-stroke",
      strokeWidth: "1.3",
      key: "pinch",
    },
  ],
]);
