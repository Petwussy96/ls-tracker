"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useI18n } from "@/lib/I18nContext";
import { setMyPassword, MIN_PASSWORD_LEN } from "@/app/actions/setMyPassword";

// Forced full-screen modal. Renders only when the server confirmed the
// current user still has passwordHash = null (i.e. their account predates
// the password switch). No dismiss/close — they must set a password before
// using the app further. After setting, we refresh server props so the
// gate evaluates to false on next render.

export function PasswordSetupModal({ displayName }: { displayName: string }) {
  const { locale } = useI18n();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LEN) {
      setError(
        locale === "nl"
          ? `Wachtwoord moet minimaal ${MIN_PASSWORD_LEN} tekens zijn.`
          : `Password must be at least ${MIN_PASSWORD_LEN} characters.`,
      );
      return;
    }
    if (password !== confirm) {
      setError(locale === "nl" ? "Wachtwoorden komen niet overeen." : "Passwords don't match.");
      return;
    }
    startTransition(async () => {
      const r = await setMyPassword({ password });
      if (!r.ok) {
        setError(
          r.error === "weak_password"
            ? locale === "nl"
              ? `Wachtwoord te kort (min. ${MIN_PASSWORD_LEN} tekens).`
              : `Password too short (${MIN_PASSWORD_LEN} chars min).`
            : r.error === "already_set"
              ? locale === "nl"
                ? "Er staat al een wachtwoord."
                : "A password is already set."
              : locale === "nl"
                ? "Er ging iets mis. Probeer opnieuw."
                : "Something went wrong.",
        );
        return;
      }
      setDone(true);
      router.refresh(); // hide the gate
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-ink-200 bg-white p-6 shadow-2xl dark:border-ink-700 dark:bg-ink-900">
        <div className="text-center">
          <div className="text-4xl">🔐</div>
          <h2 className="mt-3 text-xl font-black text-ink-900 dark:text-white">
            {locale === "nl" ? "Stel een wachtwoord in" : "Set a password"}
          </h2>
          <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
            {locale === "nl" ? (
              <>
                Hi <strong>{displayName}</strong>! We zijn overgestapt van inlog-links naar
                wachtwoorden. Kies er één om verder te gaan — dan log je voortaan gewoon in met je e-mail.
              </>
            ) : (
              <>
                Hi <strong>{displayName}</strong>! We've moved from sign-in links to passwords.
                Pick one to continue — you'll sign in with email + password from now on.
              </>
            )}
          </p>
        </div>

        {done ? (
          <div className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            ✓ {locale === "nl" ? "Klaar! Veel succes." : "Done! Have fun."}
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-300">
                {locale === "nl" ? "Nieuw wachtwoord" : "New password"}
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={MIN_PASSWORD_LEN}
                placeholder={`min. ${MIN_PASSWORD_LEN} tekens`}
                className="input"
                autoFocus
                autoComplete="new-password"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-300">
                {locale === "nl" ? "Bevestig" : "Confirm"}
              </span>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={MIN_PASSWORD_LEN}
                className="input"
                autoComplete="new-password"
              />
            </label>

            {error && (
              <div className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-full bg-ink-900 px-5 py-3 text-sm font-bold text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-400 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100 dark:disabled:bg-ink-700"
            >
              {pending
                ? locale === "nl"
                  ? "Opslaan…"
                  : "Saving…"
                : locale === "nl"
                  ? "Wachtwoord instellen →"
                  : "Set password →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
