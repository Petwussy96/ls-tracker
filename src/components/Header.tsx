"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/I18nContext";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar } from "./Avatar";
import { signOutAction } from "@/app/actions/auth";

export type HeaderUser = {
  id: string;
  username: string;
  displayName: string;
  role: "member" | "admin";
  image?: string | null;
};

export function Header({ user }: { user: HeaderUser | null }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const links: { href: string; key: Parameters<typeof t>[0] }[] = [
    { href: "/", key: "nav.leaderboard" },
    { href: "/bets", key: "nav.openBets" },
    { href: "/submit", key: "nav.submit" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/80 backdrop-blur dark:border-ink-800 dark:bg-ink-900/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center" aria-label={t("brand.name")}>
          {/* Logo — swap automatically based on theme via Tailwind's dark: variant. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/lucky-sucker-horizontal-light.svg"
            alt={t("brand.name")}
            className="block h-9 w-auto sm:h-10 dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/lucky-sucker-horizontal-dark.svg"
            alt={t("brand.name")}
            className="hidden h-9 w-auto sm:h-10 dark:block"
          />
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {links.map(({ href, key }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname.startsWith(href.split("/").slice(0, 2).join("/"));
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900"
                    : "text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white"
                }`}
              >
                {t(key)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle />
          {user ? (
            <UserMenu
              user={user}
              open={menuOpen}
              onToggle={() => setMenuOpen((v) => !v)}
              onClose={() => setMenuOpen(false)}
            />
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
            >
              {t("nav.signIn")}
            </Link>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex gap-1 overflow-x-auto border-t border-ink-100 px-3 py-2 sm:hidden dark:border-ink-800 scrollbar-thin">
        {links.map(({ href, key }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href.split("/").slice(0, 2).join("/"));
          return (
            <Link
              key={href}
              href={href}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
                active
                  ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900"
                  : "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300"
              }`}
            >
              {t(key)}
            </Link>
          );
        })}
        {user && (
          <Link
            href={`/profile/${user.username}`}
            className="whitespace-nowrap rounded-full bg-ink-100 px-3 py-1.5 text-xs font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-300"
          >
            {t("nav.profile")}
          </Link>
        )}
      </nav>
    </header>
  );
}

function UserMenu({
  user,
  open,
  onToggle,
  onClose,
}: {
  user: HeaderUser;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 rounded-full border border-ink-200 bg-white py-1 pl-1 pr-3 text-xs font-semibold text-ink-900 hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-800 dark:text-white dark:hover:bg-ink-700"
        aria-expanded={open}
      >
        <Avatar user={user} size={28} />
        <span className="hidden sm:inline">{user.displayName}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={onClose} />
          <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-ink-200 bg-white py-2 shadow-lg dark:border-ink-700 dark:bg-ink-800">
            <div className="px-4 pb-2 pt-1">
              <div className="text-xs font-semibold text-ink-900 dark:text-white">{user.displayName}</div>
              <div className="text-[11px] text-ink-400">@{user.username}</div>
            </div>
            <div className="my-1 h-px bg-ink-100 dark:bg-ink-700" />
            <Link
              href={`/profile/${user.username}`}
              onClick={onClose}
              className="block px-4 py-1.5 text-sm text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-700"
            >
              {t("nav.profile")}
            </Link>
            {user.role === "admin" && (
              <Link
                href="/admin"
                onClick={onClose}
                className="block px-4 py-1.5 text-sm text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-700"
              >
                {locale === "nl" ? "Admin dashboard" : "Admin dashboard"}
              </Link>
            )}
            <a
              href="mailto:i.dimitrijevic96@gmail.com?subject=LS%20Tracker%20feedback"
              onClick={onClose}
              className="block px-4 py-1.5 text-sm text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-700"
            >
              💬 {t("footer.feedback")}
            </a>
            <div className="my-1 h-px bg-ink-100 dark:bg-ink-700" />
            <form action={signOutAction}>
              <button
                type="submit"
                className="block w-full px-4 py-1.5 text-left text-sm text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950"
              >
                {locale === "nl" ? "Uitloggen" : "Sign out"}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
