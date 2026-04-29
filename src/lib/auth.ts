// ============================================================
// src/lib/auth.ts
//
// NextAuth.js configuration using Google Provider exclusively
// and the Prisma Adapter for user synchronization.
// ============================================================

import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";

// ── Dedicated Prisma client for NextAuth adapter ─────────────
// PrismaAdapter performs sequential DB operations (create user,
// then create account) that are incompatible with pgbouncer's
// "transaction" pool mode. We point this client at the DIRECT_URL
// (non-pooled) so the adapter always gets a real connection.
const globalForAuthPrisma = globalThis as unknown as { authPrisma: PrismaClient };
const authPrisma =
  globalForAuthPrisma.authPrisma ??
  new PrismaClient({
    datasources: {
      db: {
        // DIRECT_URL bypasses pgbouncer — required for PrismaAdapter
        url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
      },
    },
    log: ["error"],
  });
if (process.env.NODE_ENV !== "production") {
  globalForAuthPrisma.authPrisma = authPrisma;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(authPrisma),

  // Surface real adapter errors in Vercel logs instead of
  // swallowing them as a generic "OAuthCallback" error.
  debug: process.env.NODE_ENV === "development",

  events: {
    async signIn(message) {
      console.log("[NextAuth] signIn:", message.user?.email);
    },
    async signOut(message) {
      console.log("[NextAuth] signOut");
    },
  },

  logger: {
    error(code, metadata) {
      // This prints the REAL error to Vercel function logs
      console.error("[NextAuth][ERROR]", code, metadata);
    },
    warn(code) {
      console.warn("[NextAuth][WARN]", code);
    },
  },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // CRITICAL: The profile() callback may return a Google sub ID,
        // but PrismaAdapter generates its own cuid for the DB row.
        // We MUST look up the real DB user ID by email to ensure
        // all queries (stats, sessions, sets) match the correct user.
        if (user.email) {
          const dbUser = await authPrisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, isProfileComplete: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.isProfileComplete = dbUser.isProfileComplete;
          } else {
            token.id = user.id;
            token.isProfileComplete = (user as any).isProfileComplete;
          }
        } else {
          token.id = user.id;
          token.isProfileComplete = (user as any).isProfileComplete;
        }
      }

      // Self-healing: on every token refresh, verify the ID is valid.
      // If the stored ID doesn't exist in the DB, fix it using email lookup.
      if (!user && token.email && token.id) {
        const exists = await authPrisma.user.findUnique({
          where: { id: token.id as string },
          select: { id: true },
        });
        if (!exists) {
          const realUser = await authPrisma.user.findUnique({
            where: { email: token.email as string },
            select: { id: true, isProfileComplete: true },
          });
          if (realUser) {
            token.id = realUser.id;
            token.isProfileComplete = realUser.isProfileComplete;
          }
        }
      }

      if (trigger === "update" && session?.isProfileComplete) {
        token.isProfileComplete = session.isProfileComplete;
        token.name = session.name;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).isProfileComplete = token.isProfileComplete as boolean;
        session.user.name = token.name as string | null | undefined;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET ?? "replog-dev-secret-change-in-prod",
};

// ── getAuthUserId ────────────────────────────────────────────
// Call this from any server action to get the logged-in user's ID.
// Returns null instead of throwing, to avoid crashing entire requests.
export async function getAuthUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).id) {
    throw new Error("Not authenticated");
  }
  return (session.user as any).id;
}