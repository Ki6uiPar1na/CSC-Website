"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, User, ShieldAlert } from "lucide-react";
import CaptchaInput from "@/components/CaptchaInput";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          password,
          captchaAnswer,
          captchaToken
        }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error || "Recruitment failed. System error.");
      }
    } catch (err) {
      setError("Network failure. Connection lost.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 sm:py-20 text-center">
        <div className="card p-8">
          <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <User size={32} className="text-accent" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-accent">Application received</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Your application has been logged. Please wait for the <span className="text-white font-bold">Admin</span> to approve your access.
          </p>
          <Link href="/login" className="btn-primary block w-full py-3 text-base">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4 sm:py-20">
      <div className="card">
        <h2 className="text-2xl font-bold text-center text-foreground">
          Join the <span className="text-accent">club</span>
        </h2>
        <p className="text-sm text-gray-500 text-center mt-2 mb-8">Create your account to get started</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 flex items-center gap-2">
              <User size={12} className="text-accent" /> Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-black/50 border-accent/10 focus:border-accent transition-all duration-300 py-2.5"
              placeholder="Choose a username"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 flex items-center gap-2">
              <Mail size={12} className="text-accent" /> Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-black/50 border-accent/10 focus:border-accent transition-all duration-300 py-2.5"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 flex items-center gap-2">
              <Lock size={12} className="text-accent" /> Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-black/50 border-accent/10 focus:border-accent transition-all duration-300 py-2.5"
              placeholder="Create a password"
              required
            />
          </div>

          <CaptchaInput
            onVerify={(answer, token) => {
              setCaptchaAnswer(answer);
              setCaptchaToken(token);
            }}
          />

          {error && (
            <div className="text-error text-sm bg-error/5 p-3 rounded-lg border border-error/20 flex items-start gap-2">
              <ShieldAlert size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary accent w-full py-3 text-base mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-gray-500 text-xs sm:text-sm">
            Already registered?{" "}
            <Link href="/login" className="text-accent font-semibold hover:underline ml-1">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
