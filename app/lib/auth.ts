import NextAuth, { CredentialsSignin } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { canAccountAuthenticate } from "./accountStatus";
import bcrypt from "bcryptjs";

class AccountInactiveError extends CredentialsSignin {
  code = "account_inactive";
}

const nextAuth = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;
        if (!canAccountAuthenticate(user.status, user.emailVerified)) {
          throw new AccountInactiveError();
        }
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      if (token.id) {
        const currentUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { status: true, emailVerified: true, role: true },
        });

        if (
          !currentUser ||
          !canAccountAuthenticate(currentUser.status, currentUser.emailVerified)
        ) {
          token.accountInactive = true;
          delete token.id;
          delete token.role;
        } else {
          token.accountInactive = false;
          token.role = currentUser.role;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (token.accountInactive || !token.id) {
        return { ...session, user: undefined };
      }
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

export const { handlers, signIn, signOut } = nextAuth;

export async function auth() {
  const session = await nextAuth.auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true, emailVerified: true },
  });

  return currentUser &&
    canAccountAuthenticate(currentUser.status, currentUser.emailVerified)
    ? session
    : null;
}
