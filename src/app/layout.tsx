import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { I18nProvider } from "@/lib/I18nContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "LS Tracker — Lucky Sucker community",
  description:
    "Volg de bets van de Lucky Sucker Facebook-groep. Leaderboard, open bets, stats en streaks.",
};

// Inline script that runs *before* React hydrates, to apply the dark class
// pre-render and avoid a flash of light theme on dark-mode loads.
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('lucky-sucker-theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`.trim();

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const sessionUser = session?.user
    ? {
        id: session.user.id,
        username: session.user.username,
        displayName: session.user.name ?? session.user.username,
        role: session.user.role,
        image: session.user.image ?? null,
      }
    : null;

  return (
    <html lang="nl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen flex flex-col bg-ink-50 text-ink-900 dark:bg-ink-950 dark:text-ink-100">
        <ThemeProvider>
          <I18nProvider>
            <Header user={sessionUser} />
            <main className="flex-1">
              <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
            </main>
            <Footer />
          </I18nProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
