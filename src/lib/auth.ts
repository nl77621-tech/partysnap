import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";

// Custom adapter that strips unknown fields Google sends (e.g. refresh_token_expires_in)
function createAdapter() {
  const adapter = PrismaAdapter(prisma);
  return {
    ...adapter,
    linkAccount: async (account: Record<string, unknown>) => {
      const { refresh_token_expires_in, ...accountData } = account;
      void refresh_token_expires_in;
      return adapter.linkAccount!(accountData as Parameters<typeof adapter.linkAccount>[0]);
    },
  };
}

export const authOptions: NextAuthOptions = {
  adapter: createAdapter(),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/drive.file",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        (session.user as Record<string, unknown>).id = user.id;
      }
      const account = await prisma.account.findFirst({
        where: { userId: user.id, provider: "google" },
      });
      if (account) {
        (session as unknown as Record<string, unknown>).accessToken = account.access_token;
        (session as unknown as Record<string, unknown>).refreshToken = account.refresh_token;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function getSession() {
  return getServerSession(authOptions);
}

export interface ExtendedSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  accessToken?: string;
  refreshToken?: string;
}
