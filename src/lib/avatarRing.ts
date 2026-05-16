// Pure utility — kept outside `"use client"` files so server components can
// also call it. (Importing a function from a `"use client"` module on the
// server gives back a client-reference object, not a real callable.)

import type { UserRole } from "./types";

/** Avatar ring colour helper — use with Avatar's className prop. */
export function avatarRingClass(role: UserRole | null | undefined): string {
  if (role === "admin") return "ring-2 ring-amber-400 dark:ring-amber-500 shadow-sm";
  if (role === "moderator") return "ring-2 ring-sky-400 dark:ring-sky-500 shadow-sm";
  return "ring-halo";
}
