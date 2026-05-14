"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to Vercel — shows up in the project logs.
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="text-6xl">💥</div>
      <h1 className="mt-4 text-3xl font-black tracking-tight text-ink-900 dark:text-white">
        Er ging iets mis
      </h1>
      <p className="mt-2 text-ink-600 dark:text-ink-300">
        Sorry, hier crashte het. We hebben de fout gelogd — probeer opnieuw, of ga terug naar de
        ranglijst.
      </p>
      {error.digest && (
        <p className="mt-3 text-[10px] uppercase tracking-wider text-ink-400 dark:text-ink-500">
          Error ID: {error.digest}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
        >
          Probeer opnieuw
        </button>
        <Link
          href="/"
          className="rounded-full border border-ink-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-800 dark:text-white dark:hover:bg-ink-700"
        >
          Naar ranglijst
        </Link>
      </div>
    </div>
  );
}
