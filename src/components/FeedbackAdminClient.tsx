"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { updateFeedbackStatus } from "@/app/actions/feedback";

type FeedbackItem = {
  id: string;
  category: string;
  message: string;
  screenshot: string | null;
  status: "open" | "addressed" | "wontfix";
  createdAt: string;
  user: { username: string; displayName: string } | null;
};

const CATEGORY_LABEL: Record<string, { emoji: string; nl: string }> = {
  bug: { emoji: "🐞", nl: "Bug" },
  parser: { emoji: "📸", nl: "Parser" },
  feature: { emoji: "✨", nl: "Feature" },
  design: { emoji: "🎨", nl: "Design" },
  other: { emoji: "💬", nl: "Anders" },
};

export function FeedbackAdminClient({ items }: { items: FeedbackItem[] }) {
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <FeedbackCard key={item.id} item={item} />
      ))}
    </ul>
  );
}

function FeedbackCard({ item }: { item: FeedbackItem }) {
  const [status, setStatus] = useState(item.status);
  const [pending, startTransition] = useTransition();
  const cat = CATEGORY_LABEL[item.category] ?? { emoji: "❔", nl: item.category };

  function setStatusOnServer(next: typeof status) {
    setStatus(next); // optimistic
    startTransition(async () => {
      const r = await updateFeedbackStatus({ id: item.id, status: next });
      if (!r.ok) setStatus(item.status); // rollback
    });
  }

  const statusPill =
    status === "open"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
      : status === "addressed"
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
        : "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400";

  return (
    <li className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm dark:border-ink-800 dark:bg-ink-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-semibold text-ink-700 dark:bg-ink-800 dark:text-ink-200">
            {cat.emoji} {cat.nl}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusPill}`}>
            {status === "open" ? "open" : status === "addressed" ? "opgepakt" : "won't fix"}
          </span>
          {item.user ? (
            <Link
              href={`/profile/${item.user.username}`}
              className="text-xs font-semibold text-ink-700 hover:underline dark:text-ink-200"
            >
              {item.user.displayName}
            </Link>
          ) : (
            <span className="text-xs text-ink-400 dark:text-ink-500">(anoniem)</span>
          )}
        </div>
        <span className="text-[11px] text-ink-400 dark:text-ink-500">
          {new Date(item.createdAt).toLocaleString("nl-NL")}
        </span>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm text-ink-800 dark:text-ink-100">
        {item.message}
      </p>

      {item.screenshot && (
        <a
          href={item.screenshot}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.screenshot}
            alt="screenshot"
            className="max-h-72 rounded-xl border border-ink-200 object-contain dark:border-ink-700"
          />
        </a>
      )}

      <div className="mt-3 flex flex-wrap gap-2 border-t border-ink-100 pt-3 dark:border-ink-800">
        {status !== "open" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => setStatusOnServer("open")}
            className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-700 hover:bg-ink-100 disabled:opacity-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
          >
            ↩︎ Heropen
          </button>
        )}
        {status !== "addressed" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => setStatusOnServer("addressed")}
            className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            ✓ Opgepakt
          </button>
        )}
        {status !== "wontfix" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => setStatusOnServer("wontfix")}
            className="rounded-full border border-ink-300 bg-white px-3 py-1 text-xs font-semibold text-ink-600 hover:bg-ink-100 disabled:opacity-50 dark:border-ink-600 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
          >
            ✕ Won't fix
          </button>
        )}
      </div>
    </li>
  );
}
