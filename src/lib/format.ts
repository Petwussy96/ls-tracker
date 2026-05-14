import type { Locale } from "./i18n";

export function formatPercent(value: number, locale: Locale = "nl"): string {
  const intlLocale = locale === "nl" ? "nl-NL" : "en-GB";
  return new Intl.NumberFormat(intlLocale, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatOdds(odds: number): string {
  return odds.toFixed(2);
}

export function formatDate(iso: string, locale: Locale = "nl"): string {
  const intlLocale = locale === "nl" ? "nl-NL" : "en-GB";
  return new Intl.DateTimeFormat(intlLocale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function timeUntil(iso: string, locale: Locale = "nl"): string {
  const target = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = target - now;
  if (diffMs < 0) {
    return locale === "nl" ? "live / afgelopen" : "live / past";
  }
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) {
    return locale === "nl" ? `over ${minutes} min` : `in ${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return locale === "nl" ? `over ${hours} u` : `in ${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return locale === "nl" ? `over ${days} d` : `in ${days}d`;
}
