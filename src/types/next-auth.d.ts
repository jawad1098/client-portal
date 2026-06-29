import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "TEAM" | "CLIENT";
      clientId: string | null;
      /** Set when this session is an admin viewing another user's account for testing. */
      impersonatorId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "ADMIN" | "TEAM" | "CLIENT";
    clientId?: string | null;
    impersonatorId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: "ADMIN" | "TEAM" | "CLIENT";
    clientId?: string | null;
    impersonatorId?: string | null;
  }
}
