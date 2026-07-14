import { ImageResponse } from "next/og";
import { SIMULATOR_TAGLINE, SIMULATOR_TITLE } from "@/lib/simulator/config";
import { ICON_BANDED_BACKGROUND, loadArchivo, loadHudIconDataUrl, OG_SIZE } from "@/lib/og";

export const alt = SIMULATOR_TITLE;
export const size = OG_SIZE;
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function OpenGraphImage() {
  const [iconSrc, archivoRegular, archivoSemibold, archivoBold] = await Promise.all([
    loadHudIconDataUrl(),
    loadArchivo(400),
    loadArchivo(600),
    loadArchivo(700),
  ]);

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
          <div style={{ color: "#0a0a0a", fontSize: 32, fontWeight: 600 }}>hudxyz.com</div>
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
