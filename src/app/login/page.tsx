"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, User } from "lucide-react";
import CaptchaInput from "@/components/CaptchaInput";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await signIn("credentials", {
      username,
      password,
      captchaAnswer,
      captchaToken,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error === "CredentialsSignin" ? "Invalid credentials. Access denied." : result.error);
    } else {
      router.push("/challenges");
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 sm:py-20">
      <div className="card">
        <h2 className="text-2xl font-bold text-center text-foreground">
          Welcome <span className="text-primary">back</span>
        </h2>
        <p className="text-sm text-gray-500 text-center mt-2 mb-8">Sign in to continue your journey</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 flex items-center gap-2">
              <User size={12} className="text-primary" /> Username / Email
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-black/50 border-primary/20 focus:border-primary transition-all duration-300"
              placeholder="username or email"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 flex items-center gap-2">
              <Lock size={12} className="text-primary" /> Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-black/50 border-primary/20 focus:border-primary transition-all duration-300"
              placeholder="••••••••"
              required
            />
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs text-gray-500 hover:text-primary transition-colors">
                Forgot password?
              </Link>
            </div>
          </div>

          <CaptchaInput
            onVerify={(answer, token) => {
              setCaptchaAnswer(answer);
              setCaptchaToken(token);
            }}
          />

          {error && (
            <p className="text-error text-sm bg-error/10 p-3 rounded-lg border border-error/20">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full py-3 text-base">
            Sign In
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-gray-500 text-sm">
            New here?{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline ml-1">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
