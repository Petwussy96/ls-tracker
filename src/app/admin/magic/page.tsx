import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { MagicLinkGeneratorClient } from "@/components/MagicLinkGeneratorClient";

export const dynamic = "force-dynamic";

export default async function MagicLinkAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/magic");
  if (session.user.role !== "admin") {
    return (
      <div className="py-16 text-center text-ink-600 dark:text-ink-300">
        <div className="text-5xl">🔒</div>
        <h1 className="mt-4 text-2xl font-bold">Geen toegang</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/admin"
        className="text-xs font-semibold text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
      >
        ← Dashboard
      </Link>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-ink-900 dark:text-white">
        Magic-link genereren
      </h1>
      <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
        Voer het e-mailadres van een tester in en klik op <strong>Genereer</strong>. Je krijgt
        een inlog-URL die je handmatig kan delen (WhatsApp, Messenger, etc.). De link is 24
        uur geldig en kan maar één keer gebruikt worden.
      </p>
      <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">
        Werkt alleen voor bestaande accounts — eerst /admin/invites gebruiken om de speler
        aan te maken.
      </p>

      <div className="mt-6">
        <MagicLinkGeneratorClient />
      </div>
    </div>
  );
}
