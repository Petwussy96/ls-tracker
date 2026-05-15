import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LS Tracker — Lucky Sucker community",
    short_name: "LS Tracker",
    description:
      "Volg de bets van de Lucky Sucker Facebook-groep. Leaderboard, open bets, stats en streaks.",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#e87a30",
    orientation: "portrait",
    icons: [
      { src: "/icon", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
    categories: ["sports", "social", "utilities"],
  };
}
