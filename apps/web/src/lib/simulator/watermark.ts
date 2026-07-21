/** Shared "hud.xyz" export watermark — canvas stamp (screenshots) + DOM twin (recording). */

export const WATERMARK_TEXT = "hud.xyz";

/** Padding from stage edges as a fraction of the shorter side. */
export const WATERMARK_PAD_RATIO = 0.028;

/** Font size as a fraction of the shorter side. */
export const WATERMARK_FONT_RATIO = 0.028;

/** Tailwind classes for the live recording overlay (mirrors canvas stamp). */
export const WATERMARK_DOM_CLASSNAME =
  "pointer-events-none absolute bottom-6 left-8 z-30 select-none text-2xl font-bold tracking-tight text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.55)]";

export function applyWatermark(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const short = Math.min(canvas.width, canvas.height);
  const pad = Math.max(8, short * WATERMARK_PAD_RATIO);
  const fontSize = Math.max(11, short * WATERMARK_FONT_RATIO);

  ctx.save();
  ctx.font = `500 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = Math.max(1, fontSize * 0.12);
  ctx.shadowOffsetY = Math.max(1, fontSize * 0.06);
  ctx.fillStyle = "#fff";
  ctx.fillText(WATERMARK_TEXT, pad, canvas.height - pad);
  ctx.restore();
}
