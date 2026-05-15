"use client";

import { useI18n } from "@/lib/I18nContext";
import type { UserRole } from "@/lib/types";

// Compact crown/shield pill rendered next to a user's name. Returns null
// for plain members so existing layouts stay clean.

export function RoleBadge({
  role,
  size = "sm",
}: {
  role: UserRole | null | undefined;
  size?: "sm" | "md";
}) {
  const { locale } = useI18n();
  if (role !== "admin" && role !== "moderator") return null;

  const isAdmin = role === "admin";
  const colorClass = isAdmin
    ? "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900"
    : "bg-sky-100 text-sky-800 ring-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:ring-sky-900";

  const sizeClass = size === "sm"
    ? "px-1.5 py-0.5 text-[9px]"
    : "px-2 py-0.5 text-[10px]";

  const label = isAdmin
    ? "Admin"
    : locale === "nl"
      ? "Mod"
      : "Mod";

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full font-bold uppercase tracking-wider ring-1 ${colorClass} ${sizeClass}`}
      aria-label={label}
    >
      <span aria-hidden>{isAdmin ? "👑" : "🛡️"}</span>
      {label}
    </span>
  );
}

/** Avatar ring colour helper — for use with Avatar's className prop. */
export function avatarRingClass(role: UserRole | null | undefined): string {
  if (role === "admin") return "ring-2 ring-amber-400 dark:ring-amber-500 shadow-sm";
  if (role === "moderator") return "ring-2 ring-sky-400 dark:ring-sky-500 shadow-sm";
  return "ring-halo";
}
