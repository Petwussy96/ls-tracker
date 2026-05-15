// Admin view for in-app feedback submissions.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { FeedbackAdminClient } from "@/components/FeedbackAdminClient";

export const dynamic = "force-dynamic";

export default async function FeedbackAdminPage({
  searchParams,
}: {
  searchParams?: { status?: string; category?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/feedback");
  if (session.user.role !== "admin") {
    return (
      <div className="py-16 text-center text-ink-600 dark:text-ink-300">
        <div className="text-5xl">🔒</div>
        <h1 className="mt-4 text-2xl font-bold">Geen toegang</h1>
      </div>
    );
  }

  const statusFilter = searchParams?.status ?? "open";
  const categoryFilter = searchParams?.category ?? "all";

  const rows = await prisma.feedback.findMany({
    where: {
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      ...(categoryFilter !== "all" ? { category: categoryFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { username: true, displayName: true } },
    },
    take: 200,
  });

  const items = rows.map((r) => ({
    id: r.id,
    category: r.category,
    message: r.message,
    screenshot: r.screenshot,
    status: r.status as "open" | "addressed" | "wontfix",
    createdAt: r.createdAt.toISOString(),
    user: r.user
      ? { username: r.user.username, displayName: r.user.displayName }
      : null,
  }));

  // Counts for filter chips
  const counts = await prisma.feedback.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-ink-400 dark:text-ink-500">
          Admin · feedback
        </p>
        <h1 className="text-3xl font-black tracking-tight text-ink-900 dark:text-white">
          Feedback inbox
        </h1>
        <Link
          href="/admin"
          className="mt-2 inline-block text-xs font-semibold text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { value: "open", label: `Openstaand (${countMap.open ?? 0})` },
            { value: "addressed", label: `Opgepakt (${countMap.addressed ?? 0})` },
            { value: "wontfix", label: `Won't fix (${countMap.wontfix ?? 0})` },
            { value: "all", label: "Alles" },
          ] as const
        ).map((c) => {
          const active = statusFilter === c.value;
          const url = new URLSearchParams();
          if (c.value !== "open") url.set("status", c.value);
          if (categoryFilter !== "all") url.set("category", categoryFilter);
          const qs = url.toString();
          return (
            <Link
              key={c.value}
              href={qs ? `/admin/feedback?${qs}` : "/admin/feedback"}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                active
                  ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900"
                  : "border border-ink-200 bg-white text-ink-700 hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
              }`}
            >
              {c.label}
            </Link>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center dark:border-ink-800 dark:bg-ink-900">
          <div className="text-4xl">📭</div>
          <p className="mt-3 text-ink-600 dark:text-ink-300">Niks om te tonen.</p>
        </div>
      ) : (
        <FeedbackAdminClient items={items} />
      )}
    </div>
  );
}
