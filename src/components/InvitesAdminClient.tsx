"use client";

import { useState, useTransition } from "react";
import { useI18n } from "@/lib/I18nContext";
import { createInvite, revokeInvite } from "@/app/admin/invites/actions";
import { formatDate } from "@/lib/format";

type Invite = {
  id: string;
  code: string;
  createdAt: string;
  consumedAt: string | null;
  expiresAt: string | null;
  note: string | null;
  consumedBy: { username: string; displayName: string } | null;
};

export function InvitesAdminClient({ invites }: { invites: Invite[] }) {
  const { locale } = useI18n();
  const [note, setNote] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<string | null>(null);

  const pendingInvites = invites.filter((i) => !i.consumedAt);
  const consumedInvites = invites.filter((i) => i.consumedAt);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createInvite({
        note: note || undefined,
        expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLastCreated(result.code);
      setNote("");
      setExpiresInDays("");
    });
  }

  function handleRevoke(id: string) {
    if (!confirm(locale === "nl" ? "Code intrekken?" : "Revoke this code?")) return;
    startTransition(async () => {
      await revokeInvite(id);
    });
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">
          {locale === "nl" ? "Uitnodigingen" : "Invites"}
        </h1>
        <p className="mt-1 text-ink-600">
          {locale === "nl"
            ? "Genereer codes en deel ze in de Facebook-groep. Eén code per persoon."
            : "Generate codes and share them in the Facebook group. One code per person."}
        </p>
      </div>

      {/* Create form */}
      <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">
          {locale === "nl" ? "Nieuwe code maken" : "Create new code"}
        </h2>
        <form onSubmit={handleCreate} className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-600">
              {locale === "nl" ? "Notitie (optioneel)" : "Note (optional)"}
            </span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={locale === "nl" ? "Voor Klaas" : "For Klaas"}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-600">
              {locale === "nl" ? "Verloopt na (dagen)" : "Expires in (days)"}
            </span>
            <input
              type="number"
              min="1"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              placeholder={locale === "nl" ? "Geen" : "Never"}
              className="input"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-full bg-ink-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-ink-800 disabled:bg-ink-400 sm:w-auto"
            >
              {pending
                ? locale === "nl"
                  ? "Bezig…"
                  : "Working…"
                : locale === "nl"
                  ? "+ Maak code"
                  : "+ Create code"}
            </button>
          </div>
        </form>
        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>
        )}
        {lastCreated && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-700">
                {locale === "nl" ? "Nieuwe code" : "New code"}
              </div>
              <div className="font-mono text-lg font-black text-emerald-900">{lastCreated}</div>
            </div>
            <button
              onClick={() => copyCode(lastCreated)}
              className="rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              {locale === "nl" ? "Kopieer" : "Copy"}
            </button>
          </div>
        )}
        <p className="mt-3 text-xs text-ink-400">
          {locale === "nl"
            ? "Tip: deel de code als link. Bijvoorbeeld: " +
              "ls-tracker.app/join?code=LS-XYZ-1234"
            : "Tip: share as link. e.g. ls-tracker.app/join?code=LS-XYZ-1234"}
        </p>
      </section>

      {/* Pending */}
      <section>
        <h2 className="mb-3 text-lg font-bold">
          {locale === "nl" ? "Niet gebruikt" : "Pending"}
          <span className="ml-2 text-sm font-normal text-ink-400">
            ({pendingInvites.length})
          </span>
        </h2>
        {pendingInvites.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-10 text-center text-sm text-ink-400">
            {locale === "nl" ? "Geen openstaande codes." : "No pending codes."}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
            <table className="min-w-full divide-y divide-ink-100">
              <thead className="bg-ink-50/60 text-left text-[10px] uppercase tracking-wider text-ink-400">
                <tr>
                  <th className="px-4 py-3">{locale === "nl" ? "Code" : "Code"}</th>
                  <th className="px-4 py-3">{locale === "nl" ? "Notitie" : "Note"}</th>
                  <th className="px-4 py-3">{locale === "nl" ? "Aangemaakt" : "Created"}</th>
                  <th className="px-4 py-3">{locale === "nl" ? "Verloopt" : "Expires"}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 text-sm">
                {pendingInvites.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-4 py-3 font-mono font-semibold">{inv.code}</td>
                    <td className="px-4 py-3 text-ink-600">{inv.note ?? "–"}</td>
                    <td className="px-4 py-3 text-ink-400">{formatDate(inv.createdAt, locale)}</td>
                    <td className="px-4 py-3 text-ink-400">
                      {inv.expiresAt ? formatDate(inv.expiresAt, locale) : "–"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => copyCode(inv.code)}
                        className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700 hover:bg-ink-200"
                      >
                        {locale === "nl" ? "Kopieer" : "Copy"}
                      </button>
                      <button
                        onClick={() => handleRevoke(inv.id)}
                        className="ml-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200"
                      >
                        {locale === "nl" ? "Intrekken" : "Revoke"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Consumed */}
      <section>
        <h2 className="mb-3 text-lg font-bold">
          {locale === "nl" ? "Gebruikt" : "Used"}
          <span className="ml-2 text-sm font-normal text-ink-400">
            ({consumedInvites.length})
          </span>
        </h2>
        {consumedInvites.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-10 text-center text-sm text-ink-400">
            {locale === "nl" ? "Nog niemand heeft een code gebruikt." : "Nobody has used a code yet."}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
            <table className="min-w-full divide-y divide-ink-100">
              <thead className="bg-ink-50/60 text-left text-[10px] uppercase tracking-wider text-ink-400">
                <tr>
                  <th className="px-4 py-3">{locale === "nl" ? "Code" : "Code"}</th>
                  <th className="px-4 py-3">{locale === "nl" ? "Gebruikt door" : "Used by"}</th>
                  <th className="px-4 py-3">{locale === "nl" ? "Wanneer" : "When"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 text-sm">
                {consumedInvites.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-4 py-3 font-mono text-ink-400">{inv.code}</td>
                    <td className="px-4 py-3">
                      {inv.consumedBy ? (
                        <span>
                          {inv.consumedBy.displayName}{" "}
                          <span className="text-ink-400">@{inv.consumedBy.username}</span>
                        </span>
                      ) : (
                        "–"
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-400">
                      {inv.consumedAt ? formatDate(inv.consumedAt, locale) : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
