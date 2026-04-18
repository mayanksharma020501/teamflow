import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

import Credentials from "next-auth/providers/credentials";

/**
 * Auth config that's safe for Edge runtime (middleware).
 * Does NOT import Prisma/pg — those are only used in the full auth.ts.
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-client-secret",
    }),
    ...(process.env.NODE_ENV === "development"
      ? [
          Credentials({
            name: "Developer Login",
            credentials: {
              email: { label: "Email", type: "email", placeholder: "test@example.com" },
            },
            async authorize(credentials) {
              if (credentials?.email) {
                return { id: "test-user-id", email: credentials.email as string, name: "Test User" };
              }
              return null;
            },
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname === "/login";
      const isPublicPage = nextUrl.pathname === "/" || isAuthPage;
      const isApiRoute = nextUrl.pathname.startsWith("/api");

      if (isApiRoute) return true;
      if (isLoggedIn && isAuthPage) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      if (!isLoggedIn && !isPublicPage) {
        return false; // Redirects to signIn page
      }
      return true;
    },
  },
};
