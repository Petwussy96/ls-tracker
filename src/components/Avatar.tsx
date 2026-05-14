"use client";

import { useState } from "react";

export type AvatarUser = {
  displayName: string;
  image?: string | null;
};

/**
 * Generates a deterministic background color from the user's name, so the
 * fallback initials avatar isn't always the same boring dark color.
 */
function colorFromName(name: string): string {
  // Cheap string-hash → pick from a brand-friendly palette
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const palette = [
    "bg-ink-900 text-white",
    "bg-brand-600 text-white",
    "bg-amber-600 text-white",
    "bg-emerald-700 text-white",
    "bg-sky-700 text-white",
    "bg-violet-700 text-white",
    "bg-rose-700 text-white",
    "bg-orange-600 text-white",
  ];
  return palette[h % palette.length];
}

export function Avatar({
  user,
  size = 40,
  className = "",
}: {
  user: AvatarUser;
  size?: number;
  /** Extra Tailwind classes applied to the wrapper. */
  className?: string;
}) {
  const [errored, setErrored] = useState(false);

  const dim = { width: size, height: size };
  const fontSize = Math.max(10, Math.round(size * 0.4));

  if (user.image && !errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.image}
        alt={user.displayName}
        onError={() => setErrored(true)}
        style={dim}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  const initial = user.displayName.charAt(0).toUpperCase();
  const palette = colorFromName(user.displayName || "?");

  return (
    <div
      style={{ ...dim, fontSize }}
      className={`shrink-0 inline-flex items-center justify-center rounded-full font-black tracking-tight ${palette} ${className}`}
      aria-label={user.displayName}
    >
      {initial}
    </div>
  );
}
