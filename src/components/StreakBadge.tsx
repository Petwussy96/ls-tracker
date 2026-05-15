"use client";

// Streak badge with escalating visuals:
//   1-2W  →  emerald, single flame      🔥
//   3-4W  →  amber/orange, two flames   🔥🔥  (warming up)
//   5-7W  →  red/orange, three flames   🔥🔥🔥 (on fire)
//   8+ W  →  red glow, lightning         ⚡⚡⚡ (legendary)
//
//   1-2L  →  rose, single snowflake     ❄️
//   3-4L  →  cyan, snowman               ☃️ (cold)
//   5+ L  →  cyan glow, freezing         🥶 (frozen)
//
// Tiered tiers make the leaderboard chase visually rewarding without
// being clutter for everyone.

type Tier = {
  emoji: string;
  bg: string; // text + background classes
};

function winTier(streak: number): Tier {
  if (streak >= 8) {
    return {
      emoji: "⚡⚡⚡",
      bg: "bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-md ring-1 ring-amber-300 dark:ring-amber-700",
    };
  }
  if (streak >= 5) {
    return {
      emoji: "🔥🔥🔥",
      bg: "bg-gradient-to-r from-orange-100 to-amber-200 text-orange-900 ring-1 ring-orange-300 dark:from-orange-900/60 dark:to-amber-900/60 dark:text-orange-100 dark:ring-orange-700",
    };
  }
  if (streak >= 3) {
    return {
      emoji: "🔥🔥",
      bg: "bg-amber-100 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:ring-amber-800",
    };
  }
  return {
    emoji: "🔥",
    bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200",
  };
}

function lossTier(streak: number): Tier {
  const abs = Math.abs(streak);
  if (abs >= 5) {
    return {
      emoji: "🥶",
      bg: "bg-gradient-to-r from-sky-200 to-cyan-300 text-cyan-900 ring-1 ring-cyan-300 dark:from-sky-900/60 dark:to-cyan-900/60 dark:text-cyan-100 dark:ring-cyan-700",
    };
  }
  if (abs >= 3) {
    return {
      emoji: "☃️",
      bg: "bg-cyan-100 text-cyan-800 ring-1 ring-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-200 dark:ring-cyan-800",
    };
  }
  return {
    emoji: "❄️",
    bg: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200",
  };
}

export function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) {
    return <span className="text-xs text-ink-400 dark:text-ink-500">–</span>;
  }
  const isWin = streak > 0;
  const tier = isWin ? winTier(streak) : lossTier(streak);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${tier.bg}`}
      title={
        isWin
          ? `${streak} wins op rij`
          : `${Math.abs(streak)} verliezen op rij`
      }
    >
      <span aria-hidden>{tier.emoji}</span>
      {Math.abs(streak)}
      {isWin ? "W" : "L"}
    </span>
  );
}
