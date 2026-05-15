// Type augmentation: tell Auth.js that our session.user has extra fields.

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: "member" | "moderator" | "admin";
    } & DefaultSession["user"];
  }

  interface User {
    username?: string;
    role?: string;
  }
}
