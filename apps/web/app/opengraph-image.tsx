import { ImageResponse } from "next/og";
import { SIMULATOR_TITLE } from "@/lib/simulator/config";

export const alt = SIMULATOR_TITLE;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ color: "#CEFF00", fontSize: 36, fontWeight: 700, marginBottom: 28 }}>
          hud.xyz
        </div>
        <div
          style={{
            color: "#ffffff",
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.1,
            maxWidth: 1000,
          }}
        >
          {SIMULATOR_TITLE}
        </div>
        <div
          style={{
            color: "#a3a3a3",
            fontSize: 30,
            marginTop: 32,
            lineHeight: 1.4,
            maxWidth: 1000,
          }}
        >
          Test MRBD web apps at 600×600 — D-pad input, screenshots, and screen recording
        </div>
      </div>
    ),
    { ...size },
  );
}
