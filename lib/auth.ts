import { NextAuthOptions, DefaultSession, DefaultUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    isActive?: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",

      credentials: {
        email: {
          label: "Email",
          type: "email",
        },

        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email.toLowerCase(),
          },
        });

        if (!user) {
          throw new Error("User not found");
        }

        if (!user.isActive) {
          throw new Error("Account disabled");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // Initial login
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.isActive = true;
      }

      // Check user still active
      if (token?.id) {
        const dbUser = await prisma.user.findUnique({
          where: {
            id: token.id,
          },
          select: {
            isActive: true,
            role: true,
          },
        });

        // Session destroy if disabled
        if (!dbUser || !dbUser.isActive) {
          return {};
        }

        token.role = dbUser.role;
      }

      return token;
    },

    async session({ session, token }) {
      if (!token?.id) {
        return null;
      }

      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }

      return session;
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },

  session: {
    strategy: "jwt",

    // 1 hour auto logout
    maxAge: 60 * 60,

    updateAge: 5 * 60,
  },

  jwt: {
    maxAge: 60 * 60,
  },

  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",

      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",

        // Destroy on browser close
        maxAge: undefined,
      },
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
