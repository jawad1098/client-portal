import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      id: "credentials",
      credentials: {
        email: { label: "Email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;

        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          clientId: user.clientId,
          impersonatorId: null,
        };
      },
    }),
    Credentials({
      id: "impersonate",
      name: "Impersonate",
      credentials: {
        token: { label: "Token" },
      },
      authorize: async (credentials) => {
        const token = credentials?.token;
        if (typeof token !== "string" || !token) {
          return null;
        }

        const grant = await prisma.impersonationGrant.findUnique({ where: { token } });
        if (!grant) {
          return null;
        }

        // One-time use: consume it immediately so the token can't be replayed.
        await prisma.impersonationGrant.delete({ where: { id: grant.id } });

        if (grant.expiresAt < new Date()) {
          return null;
        }

        const targetUser = await prisma.user.findUnique({ where: { id: grant.targetUserId } });
        if (!targetUser) {
          return null;
        }

        // A grant where adminId === targetUserId is the "return to admin" case.
        const impersonatorId = grant.adminId === grant.targetUserId ? null : grant.adminId;

        return {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          clientId: targetUser.clientId,
          impersonatorId,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.userId = user.id as string;
        token.role = (user as { role: string }).role;
        token.clientId = (user as { clientId: string | null }).clientId ?? null;
        token.impersonatorId = (user as { impersonatorId?: string | null }).impersonatorId ?? null;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as "ADMIN" | "TEAM" | "CLIENT";
        session.user.clientId = (token.clientId as string | null) ?? null;
        session.user.impersonatorId = (token.impersonatorId as string | null) ?? null;
      }
      return session;
    },
  },
});
