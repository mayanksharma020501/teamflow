import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session: updateSession }) {
      if (user) {
        token.id = user.id;
        
        let dbUser = await prisma.user.findUnique({
          where: { email: user.email as string },
          select: { id: true, onboarded: true, globalRole: true, name: true },
        });

        // Auto-create dummy user for Dev Credentials login
        if (!dbUser && process.env.NODE_ENV === "development") {
          dbUser = await prisma.user.create({
            data: {
              email: user.email as string,
              name: user.name || "Test User",
            },
            select: { id: true, onboarded: true, globalRole: true, name: true },
          });
        }

        if (dbUser) {
          token.id = dbUser.id; // use real DB id
          token.onboarded = dbUser.onboarded;
          token.globalRole = dbUser.globalRole;
          token.name = dbUser.name ?? user.name;
        }
      }

      // Handle session updates (e.g. name change)
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { name: true, onboarded: true, globalRole: true },
        });
        if (dbUser) {
          token.name = dbUser.name;
          token.onboarded = dbUser.onboarded;
          token.globalRole = dbUser.globalRole;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user = session.user as any;
        user.onboarded = token.onboarded;
        user.globalRole = token.globalRole;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/dashboard`;
      }
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
});
