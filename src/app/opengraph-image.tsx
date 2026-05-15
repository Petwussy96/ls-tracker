import { ImageResponse } from "next/og";

// Next.js auto-generates the <meta property="og:image"> tag pointing to this
// file. The image is rendered at request time using ImageResponse — same
// engine as Vercel's OG image generation. Output is a static PNG cached at
// the edge.

export const runtime = "edge";
export const alt = "LS Tracker — Lucky Sucker community tracker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #020617 0%, #1e293b 50%, #0f172a 100%)",
          position: "relative",
        }}
      >
        {/* Brand glow blobs — mirror the in-app hero */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: "rgba(225, 29, 72, 0.35)",
            filter: "blur(80px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -160,
            left: -80,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: "rgba(245, 158, 11, 0.25)",
            filter: "blur(80px)",
          }}
        />

        {/* LS chip — same shape/colors as favicon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "#e87a30",
            color: "#f6f2e7",
            fontSize: 60,
            fontWeight: 900,
            letterSpacing: "-3px",
            marginBottom: 32,
            zIndex: 1,
          }}
        >
          LS
        </div>

        {/* Live tracker badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "8px 16px",
            borderRadius: 999,
            background: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            color: "white",
            fontSize: 22,
            textTransform: "uppercase",
            letterSpacing: 2,
            marginBottom: 24,
            width: "fit-content",
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "#10b981",
            }}
          />
          Live tracker
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: "white",
            letterSpacing: "-4px",
            lineHeight: 1,
            zIndex: 1,
          }}
        >
          LS Tracker
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 36,
            color: "#cbd5e1",
            marginTop: 16,
            maxWidth: 900,
            lineHeight: 1.2,
            zIndex: 1,
          }}
        >
          Lucky Sucker community bet tracker — leaderboard, win-rate, streaks
        </div>

        {/* Footer line */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 80,
            fontSize: 22,
            color: "#94a3b8",
            zIndex: 1,
          }}
        >
          luckysucker.duckdns.org · van de Lucky Sucker FB-groep
        </div>
      </div>
    ),
    { ...size },
  );
}
