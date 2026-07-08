import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SIMULATOR_TAGLINE, SIMULATOR_TITLE } from "@/lib/simulator/config";

export const alt = SIMULATOR_TITLE;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

/** Hard color stops — stacked bands from app/icon.svg (no blending between steps) */
const ICON_BANDED_BACKGROUND = [
  "#00F3FE 0%",
  "#00F3FE 10%",
  "#01DCFE 10%",
  "#01DCFE 20%",
  "#01C4FF 20%",
  "#01C4FF 30%",
  "#00A6FF 30%",
  "#00A6FF 40%",
  "#0086FE 40%",
  "#0086FE 50%",
  "#0067FF 50%",
  "#0067FF 60%",
  "#0049FF 60%",
  "#0049FF 70%",
  "#012CFF 70%",
  "#012CFF 80%",
  "#0115FF 80%",
  "#0115FF 90%",
  "#0003FE 90%",
  "#0003FE 100%",
].join(", ");

async function loadArchivo(weight: 400 | 600 | 700) {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=Archivo:wght@${weight}`, {
    headers: {
      // Older UA so Google serves woff (Satori does not support woff2).
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  }).then((res) => res.text());
  const match =
    css.match(/src: url\((.+)\) format\('woff'\)/) ??
    css.match(/src: url\((.+)\) format\('truetype'\)/) ??
    css.match(/src: url\((.+)\) format\('opentype'\)/);
  if (!match) throw new Error(`Failed to load Archivo ${weight}`);
  return fetch(match[1]).then((res) => res.arrayBuffer());
}

export default async function OpenGraphImage() {
  const [icon, archivoRegular, archivoSemibold, archivoBold] = await Promise.all([
    readFile(join(process.cwd(), "app/icon.svg")),
    loadArchivo(400),
    loadArchivo(600),
    loadArchivo(700),
  ]);
  const iconSrc = `data:image/svg+xml;base64,${icon.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        background: `linear-gradient(to bottom, ${ICON_BANDED_BACKGROUND})`,
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 64,
        fontFamily: "Archivo",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          padding: "56px 64px",
          width: 1040,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 36,
          }}
        >
          <img src={iconSrc} width={72} height={72} alt="" />
          <div style={{ color: "#0a0a0a", fontSize: 32, fontWeight: 600 }}>hud.xyz</div>
        </div>
        <div
          style={{
            color: "#0a0a0a",
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.05,
          }}
        >
          {SIMULATOR_TITLE}
        </div>
        <div
          style={{
            color: "#525252",
            fontSize: 28,
            fontWeight: 400,
            marginTop: 28,
            lineHeight: 1.45,
          }}
        >
          {SIMULATOR_TAGLINE}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Archivo", data: archivoRegular, weight: 400, style: "normal" },
        { name: "Archivo", data: archivoSemibold, weight: 600, style: "normal" },
        { name: "Archivo", data: archivoBold, weight: 700, style: "normal" },
      ],
    },
  );
}
