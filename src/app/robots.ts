import type { MetadataRoute } from "next";

// Block bots from admin/auth surfaces. Public pages stay indexable.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/login", "/join", "/api"],
      },
    ],
  };
}
