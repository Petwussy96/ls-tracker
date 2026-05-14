"use client";

export function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) {
    return <span className="text-xs text-ink-400">–</span>;
  }
  const isWin = streak > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        isWin ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
      }`}
    >
      {isWin ? "🔥" : "❄️"} {Math.abs(streak)}{isWin ? "W" : "L"}
    </span>
  );
}
