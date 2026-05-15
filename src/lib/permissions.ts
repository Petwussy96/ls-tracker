// Centralized role helpers so we don't sprinkle string checks across the
// codebase. `member` < `moderator` < `admin`.

import type { UserRole } from "./types";

export function isAdmin(role: UserRole | null | undefined): role is "admin" {
  return role === "admin";
}

export function isModerator(role: UserRole | null | undefined): role is "moderator" {
  return role === "moderator";
}

/** Mods + admins — anyone who can act on reports / override bets. */
export function canModerate(role: UserRole | null | undefined): boolean {
  return role === "moderator" || role === "admin";
}

/** Visual label for a role (NL/EN). Returns null for members → no badge shown. */
export function roleLabel(
  role: UserRole | null | undefined,
  locale: "nl" | "en",
): { emoji: string; label: string } | null {
  if (role === "admin") return { emoji: "👑", label: "Admin" };
  if (role === "moderator")
    return { emoji: "🛡️", label: locale === "nl" ? "Moderator" : "Mod" };
  return null;
}
