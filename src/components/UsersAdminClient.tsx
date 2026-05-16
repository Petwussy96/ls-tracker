"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { RoleBadge } from "@/components/RoleBadge";
import { avatarRingClass } from "@/lib/avatarRing";
import { updateUserRole } from "@/app/actions/updateUserRole";
import { resetUserPassword } from "@/app/actions/resetUserPassword";
import type { UserRole } from "@/lib/types";

type Row = {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  joinedAt: string;
  image: string | null;
  avatar: string | null;
};

export function UsersAdminClient({
  users,
  currentUserId,
}: {
  users: Row[];
  currentUserId: string;
}) {
  return (
    <ul className="space-y-2">
      {users.map((u) => (
        <UserRow key={u.id} user={u} isSelf={u.id === currentUserId} />
      ))}
    </ul>
  );
}

function UserRow({ user, isSelf }: { user: Row; isSelf: boolean }) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleReset() {
    if (!confirm(`Reset wachtwoord voor ${user.displayName}? Bestaande sessies worden uitgelogd.`)) return;
    setError(null);
    setResetUrl(null);
    startTransition(async () => {
      const r = await resetUserPassword({ userId: user.id });
      if (!r.ok) {
        setError(
          r.error === "user_not_found" ? "Geen geldig e-mailadres bij deze user." :
          r.error === "rate_limited" ? "Te veel resets — wacht even." :
          "Reset mislukt.",
        );
        return;
      }
      setResetUrl(r.url);
    });
  }

  async function copyResetUrl() {
    if (!resetUrl) return;
    try {
      await navigator.clipboard.writeText(resetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  function change(next: UserRole) {
    if (next === role) return;
    setError(null);
    const prev = role;
    setRole(next); // optimistic
    startTransition(async () => {
      const r = await updateUserRole({ userId: user.id, role: next });
      if (!r.ok) {
        setRole(prev);
        setError(
          r.error === "cannot_demote_self"
            ? "Je bent de enige admin — eerst iemand anders promoveren."
            : r.error === "not_admin"
              ? "Geen rechten."
              : "Aanpassing mislukt.",
        );
      }
    });
  }

  const avatarUser = {
    displayName: user.displayName,
    image: user.image ?? user.avatar ?? null,
  };

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-white p-3 shadow-sm dark:border-ink-800 dark:bg-ink-900">
      <Link
        href={`/profile/${user.username}`}
        className="flex min-w-0 items-center gap-3"
      >
        <Avatar user={avatarUser} size={36} className={avatarRingClass(role)} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink-900 dark:text-white">
              {user.displayName}
            </span>
            <RoleBadge role={role} />
            {isSelf && (
              <span className="text-[10px] uppercase tracking-wider text-ink-400">
                jij
              </span>
            )}
          </div>
          <div className="text-xs text-ink-400 dark:text-ink-500">@{user.username}</div>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        {(["member", "moderator", "admin"] as const).map((r) => {
          const active = role === r;
          const color =
            r === "admin"
              ? active
                ? "bg-amber-500 text-white"
                : "border border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-950"
              : r === "moderator"
                ? active
                  ? "bg-sky-500 text-white"
                  : "border border-sky-300 text-sky-700 hover:bg-sky-50 dark:border-sky-700 dark:text-sky-200 dark:hover:bg-sky-950"
                : active
                  ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900"
                  : "border border-ink-200 text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800";
          return (
            <button
              key={r}
              type="button"
              disabled={pending}
              onClick={() => change(r)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${color}`}
            >
              {r === "admin" ? "👑 Admin" : r === "moderator" ? "🛡️ Mod" : "Lid"}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="w-full text-xs text-rose-600 dark:text-rose-400">{error}</p>
      )}

      <div className="w-full flex flex-wrap items-center gap-2 border-t border-ink-100 dark:border-ink-800 pt-2 mt-1">
        <button
          type="button"
          disabled={pending}
          onClick={handleReset}
          className="rounded-full bg-amber-100 dark:bg-amber-900/60 px-3 py-1 text-[11px] font-semibold text-amber-900 dark:text-amber-100 hover:bg-amber-200 dark:hover:bg-amber-800 disabled:opacity-50"
        >
          🔑 Reset wachtwoord
        </button>
        {resetUrl && (
          <>
            <code className="break-all text-[11px] text-emerald-700 dark:text-emerald-300">
              {resetUrl}
            </code>
            <button
              type="button"
              onClick={copyResetUrl}
              className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
            >
              {copied ? "✓" : "📋"} Kopieer
            </button>
          </>
        )}
      </div>
    </li>
  );
}
