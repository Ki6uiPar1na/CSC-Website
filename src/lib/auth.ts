import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { UserModel } from "@/models/UserModel";
import bcrypt from "bcryptjs";
import { verifyCaptcha } from "./captcha-utils";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        captchaAnswer: { label: "Captcha Answer", type: "text" },
        captchaToken: { label: "Captcha Token", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        
        if (!verifyCaptcha(credentials.captchaAnswer || "", credentials.captchaToken || "")) {
          return null;
        }

        let user = await UserModel.findByUsername(credentials.username);
        if (!user) {
          user = await UserModel.findByEmail(credentials.username);
        }
        if (user && await bcrypt.compare(credentials.password, user.password_hash)) {
          // Check if user is approved
          if (user.status === 'pending') {
            throw new Error("Your account is pending admin approval.");
          }
          if (user.status === 'rejected') {
            throw new Error("Your account has been rejected by the admin.");
          }

          return {
            id: user.id.toString(),
            name: user.username,
            email: user.email,
            role: user.role_id,
            status: user.status
          };
        }
        return null;
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as any).role;
      }
      return token;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
