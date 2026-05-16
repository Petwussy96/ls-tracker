import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";

// Per-bet dynamic OG image — renders a nice "betting slip" card that FB,
// WhatsApp, Twitter, etc. show as a preview when the URL is shared.

export const alt = "LS Tracker bet";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Use Node runtime — Prisma client cannot run in edge runtime.
export const runtime = "nodejs";

function fallbackImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#020617",
          color: "#f1f5f9",
          fontSize: 48,
        }}
      >
        LS Tracker
      </div>
    ),
    { ...size },
  );
}

export default async function Image({ params }: { params: { id: string } }) {
  let bet;
  try {
    bet = await prisma.bet.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { displayName: true, role: true } },
        selections: { orderBy: { position: "asc" }, take: 5 },
      },
    });
  } catch (err) {
    console.error("[bet/[id]/opengraph-image] prisma failed", err);
    return fallbackImage();
  }

  if (!bet) return fallbackImage();

  let totalLegs = bet.selections.length;
  try {
    totalLegs = await prisma.selection.count({ where: { betId: bet.id } });
  } catch (err) {
    console.error("[bet/[id]/opengraph-image] selection count failed", err);
  }
  const moreCount = Math.max(0, totalLegs - bet.selections.length);

  const statusColor =
    bet.status === "won" ? "#10b981" :
    bet.status === "lost" ? "#e11d48" :
    bet.status === "void" ? "#64748b" :
    "#f59e0b";
  const statusLabel =
    bet.status === "won" ? "GEWONNEN" :
    bet.status === "lost" ? "VERLOREN" :
    bet.status === "void" ? "GEANNULEERD" :
    "OPEN";

  const roleEmoji =
    bet.user.role === "admin" ? "👑" :
    bet.user.role === "moderator" ? "🛡️" : "";

  try {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            padding: "60px",
            display: "flex",
            flexDirection: "column",
            background: "linear-gradient(135deg, #020617 0%, #1e293b 50%, #0f172a 100%)",
            position: "relative",
            color: "white",
          }}
        >
          {/* Brand-glow blobs */}
          <div
            style={{
              position: "absolute",
              top: -120,
              right: -120,
              width: 420,
              height: 420,
              borderRadius: "50%",
              background: "rgba(225, 29, 72, 0.25)",
              filter: "blur(80px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -120,
              left: -60,
              width: 380,
              height: 380,
              borderRadius: "50%",
              background: "rgba(245, 158, 11, 0.18)",
              filter: "blur(80px)",
            }}
          />

          {/* Top row: LS chip + user + status pill */}
          <div
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 1 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "#e87a30",
                  color: "#f6f2e7",
                  fontSize: 32,
                  fontWeight: 900,
                  letterSpacing: "-2px",
                }}
              >
                LS
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 18, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: 2 }}>
                  Lucky Sucker Tracker
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, display: "flex", alignItems: "center", gap: 8 }}>
                  {roleEmoji} {bet.user.displayName}
                </div>
              </div>
            </div>

            <div
              style={{
                padding: "10px 22px",
                borderRadius: 999,
                background: statusColor,
                color: "white",
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: 2,
              }}
            >
              {statusLabel}
            </div>
          </div>

          {/* Selections list */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              marginTop: 40,
              zIndex: 1,
            }}
          >
            {bet.selections.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  padding: "14px 20px",
                  background: "rgba(255, 255, 255, 0.06)",
                  borderRadius: 14,
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "white" }}>
                    {s.selection}
                  </div>
                  <div style={{ fontSize: 16, color: "#94a3b8" }}>{s.match}</div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#fbbf24" }}>
                  {s.odds.toFixed(2)}
                </div>
              </div>
            ))}
            {moreCount > 0 && (
              <div style={{ fontSize: 18, color: "#94a3b8", paddingLeft: 6 }}>
                + {moreCount} {moreCount === 1 ? "extra been" : "extra benen"}
              </div>
            )}
          </div>

          {/* Bottom: combined odds */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              zIndex: 1,
              marginTop: 30,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 16, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.5 }}>
                Totaal quotering
              </div>
              <div style={{ fontSize: 80, fontWeight: 900, letterSpacing: "-3px", lineHeight: 1 }}>
                {bet.combinedOdds.toFixed(2)}
              </div>
            </div>
            <div style={{ fontSize: 16, color: "#64748b" }}>
              luckysucker.duckdns.org
            </div>
          </div>
        </div>
      ),
      { ...size },
    );
  } catch (err) {
    console.error("[bet/[id]/opengraph-image] ImageResponse build failed", err);
    return fallbackImage();
  }
}
