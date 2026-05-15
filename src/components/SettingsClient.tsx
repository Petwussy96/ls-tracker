"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/I18nContext";
import { AvatarPicker } from "@/components/AvatarPicker";
import { Avatar } from "@/components/Avatar";
import { updateProfile, changePassword } from "@/app/actions/updateProfile";
import { deleteMyAccount } from "@/app/actions/deleteAccount";
import { MIN_PASSWORD_LEN } from "@/lib/passwordConstants";

type UserData = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  image: string | null;
  avatar: string | null;
  role: "member" | "moderator" | "admin";
  hasPassword: boolean;
};

export function SettingsClient({ user }: { user: UserData }) {
  const { locale } = useI18n();
  const router = useRouter();

  return (
    <div className="space-y-8">
      <AvatarSection user={user} />
      <ProfileSection user={user} />
      {user.hasPassword && <PasswordSection />}
      <DangerSection isAdmin={user.role === "admin"} />
    </div>
  );
}

function AvatarSection({ user }: { user: UserData }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm dark:border-ink-700 dark:bg-ink-900">
      <h2 className="text-lg font-bold text-ink-900 dark:text-white">Avatar</h2>
      <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
        Upload je eigen foto of kies een preset chip.
      </p>
      <div className="mt-4 flex items-center gap-4">
        <Avatar user={{ displayName: user.displayName, image: user.image ?? user.avatar ?? null }} size={64} className="ring-halo" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-ink-200 bg-white px-4 py-1.5 text-sm font-semibold text-ink-800 hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100 dark:hover:bg-ink-700"
        >
          Wijzig avatar
        </button>
      </div>
      <AvatarPicker
        open={open}
        onClose={() => setOpen(false)}
        currentUser={{ displayName: user.displayName, image: user.image ?? user.avatar ?? null }}
      />
    </section>
  );
}

function ProfileSection({ user }: { user: UserData }) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [email, setEmail] = useState(user.email);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("idle");
    startTransition(async () => {
      const r = await updateProfile({ displayName, email });
      if (!r.ok) {
        setStatus("error");
        setError(
          r.error === "invalid_displayname" ? "Naam moet 2-40 tekens zijn." :
          r.error === "invalid_email" ? "Ongeldig e-mailadres." :
          r.error === "email_taken" ? "Dit e-mailadres is al in gebruik." :
          r.error === "rate_limited" ? "Even rustig — te veel updates." :
          "Er ging iets mis.",
        );
        return;
      }
      setStatus("saved");
      router.refresh();
      setTimeout(() => setStatus("idle"), 2500);
    });
  }

  return (
    <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm dark:border-ink-700 dark:bg-ink-900">
      <h2 className="text-lg font-bold text-ink-900 dark:text-white">Profiel</h2>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-300">
            Naam
          </span>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-300">
            E-mail
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </label>
        <div>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-300">
            Gebruikersnaam
          </span>
          <div className="rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 font-mono text-sm text-ink-500 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-400">
            @{user.username}
          </div>
          <p className="mt-1 text-[11px] text-ink-400 dark:text-ink-500">
            Niet aanpasbaar — wordt gebruikt in profiel-links.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        )}
        {status === "saved" && (
          <div className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            ✓ Opgeslagen
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-ink-900 px-5 py-2 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
        >
          {pending ? "Opslaan…" : "Opslaan"}
        </button>
      </form>
    </section>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (next.length < MIN_PASSWORD_LEN) {
      setError(`Nieuw wachtwoord moet minimaal ${MIN_PASSWORD_LEN} tekens zijn.`);
      return;
    }
    if (next !== confirm) {
      setError("Nieuwe wachtwoorden komen niet overeen.");
      return;
    }
    startTransition(async () => {
      const r = await changePassword({ current, next });
      if (!r.ok) {
        setError(
          r.error === "wrong_current" ? "Huidig wachtwoord klopt niet." :
          r.error === "weak_new" ? "Nieuw wachtwoord is te kort." :
          r.error === "rate_limited" ? "Even rustig." :
          "Er ging iets mis.",
        );
        return;
      }
      setSaved(true);
      setCurrent("");
      setNext("");
      setConfirm("");
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm dark:border-ink-700 dark:bg-ink-900">
      <h2 className="text-lg font-bold text-ink-900 dark:text-white">Wachtwoord wijzigen</h2>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input
          type="password"
          required
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Huidig wachtwoord"
          autoComplete="current-password"
          className="input"
        />
        <input
          type="password"
          required
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder={`Nieuw wachtwoord (min. ${MIN_PASSWORD_LEN} tekens)`}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LEN}
          className="input"
        />
        <input
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Bevestig nieuw wachtwoord"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LEN}
          className="input"
        />
        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        )}
        {saved && (
          <div className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            ✓ Wachtwoord gewijzigd
          </div>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-ink-900 px-5 py-2 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
        >
          {pending ? "Wijzigen…" : "Wachtwoord wijzigen"}
        </button>
      </form>
    </section>
  );
}

function DangerSection({ isAdmin }: { isAdmin: boolean }) {
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    setError(null);
    if (confirmText !== "VERWIJDER") {
      setError('Type exact "VERWIJDER" om te bevestigen.');
      return;
    }
    startTransition(async () => {
      const r = await deleteMyAccount();
      if (!r.ok) {
        setError(
          r.error === "last_admin" ? "Je bent de enige admin. Promoot eerst iemand anders." :
          r.error === "rate_limited" ? "Even rustig — te veel verzoeken." :
          "Verwijderen mislukt.",
        );
        return;
      }
      // Logout cookie is cleared server-side; navigate away to be sure.
      window.location.href = "/login?deleted=1";
    });
  }

  return (
    <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 dark:border-rose-900/40 dark:bg-rose-950/30">
      <h2 className="text-lg font-bold text-rose-900 dark:text-rose-100">⚠️ Account verwijderen</h2>
      <p className="mt-1 text-sm text-rose-800 dark:text-rose-200">
        Dit verwijdert je account, je bets, je avatar en alle bijbehorende data permanent.
        Niet ongedaan te maken.
        {isAdmin && " Je bent admin — promoot eerst iemand anders als jij de enige bent."}
      </p>
      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">
            Type "VERWIJDER" om te bevestigen
          </span>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="VERWIJDER"
            className="input border-rose-300 dark:border-rose-800"
          />
        </label>
        {error && (
          <div className="rounded-xl bg-rose-100 px-4 py-2 text-sm text-rose-900 dark:bg-rose-900/60 dark:text-rose-100">
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={pending || confirmText !== "VERWIJDER"}
          className="rounded-full bg-rose-700 px-5 py-2 text-sm font-bold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Verwijderen…" : "Verwijder mijn account"}
        </button>
      </div>
    </section>
  );
}
