import { ImageResponse } from "next/og";

import { authorSiteLabel, formatOpenCount, totalOpenCount } from "@/lib/apps/listing-urls";
import { getPublishedListingByPublicId } from "@/lib/apps/queries";
import {
  ICON_BANDED_BACKGROUND,
  loadArchivo,
  loadHudIconDataUrl,
  loadImageDataUrl,
  OG_SIZE,
} from "@/lib/og";

export const alt = "App on hud.xyz";
export const size = OG_SIZE;
export const contentType = "image/png";
export const runtime = "nodejs";

type ImageProps = {
  params: Promise<{ slug: string; publicId: string }>;
};

export default async function OpenGraphImage({ params }: ImageProps) {
  const { publicId } = await params;
  const listing = await getPublishedListingByPublicId(publicId);

  const [hudIcon, archivoRegular, archivoMedium, archivoSemibold, archivoBold, appIcon] =
    await Promise.all([
      loadHudIconDataUrl(),
      loadArchivo(400),
      loadArchivo(500),
      loadArchivo(600),
      loadArchivo(700),
      listing?.iconUrl ? loadImageDataUrl(listing.iconUrl) : Promise.resolve(null),
    ]);

  const name = listing?.name ?? "App not found";
  const author = listing ? authorSiteLabel(listing.author) : null;
  const meta = listing
    ? [
        listing.listingType === "game" ? "Game" : "App",
        listing.categoryName,
        formatOpenCount(totalOpenCount(listing)),
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

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
          padding: "48px 56px",
          width: 1040,
          height: 502,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 13,
          }}
        >
          {/* Match Logo desktop ratio: icon 30 / wordmark text-2xl (24) / gap-2 (8) */}
          <img src={hudIcon} width={48} height={48} alt="" />
          <div
            style={{
              color: "#0a0a0a",
              fontSize: 38,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: "-0.05em",
            }}
          >
            hud.xyz
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 44,
            flex: 1,
          }}
        >
          {appIcon ? (
            <img
              src={appIcon}
              width={240}
              height={240}
              alt=""
              style={{ borderRadius: 52, objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: 240,
                height: 240,
                borderRadius: 52,
                background: "#f4f4f5",
                display: "flex",
              }}
            />
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minWidth: 0,
              justifyContent: "center",
            }}
          >
            <div
              style={{
                color: "#0a0a0a",
                fontSize: 64,
                fontWeight: 700,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              {name}
            </div>
            {author ? (
              <div
                style={{
                  color: "#0067ff",
                  fontSize: 30,
                  fontWeight: 600,
                  marginTop: 14,
                }}
              >
                {author}
              </div>
            ) : null}
            {meta ? (
              <div
                style={{
                  color: "#000000",
                  fontSize: 30,
                  fontWeight: 500,
                  marginTop: 14,
                }}
              >
                {meta}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Archivo", data: archivoRegular, weight: 400, style: "normal" },
        { name: "Archivo", data: archivoMedium, weight: 500, style: "normal" },
        { name: "Archivo", data: archivoSemibold, weight: 600, style: "normal" },
        { name: "Archivo", data: archivoBold, weight: 700, style: "normal" },
      ],
    },
  );
}
