"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ShieldAlert, ArrowLeft, CheckCircle } from "lucide-react";
import CaptchaInput from "@/components/CaptchaInput";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, captchaAnswer, captchaToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Request failed");
      } else {
        setSent(true);
      }
    } catch {
      setError("Network failure. Connection lost.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 sm:py-20 text-center">
        <div className="card p-8">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-primary">Check your inbox</h2>
          <p className="text-gray-400 mb-8 leading-relaxed text-sm">
            If an account with that email exists, we&apos;ve sent a password reset link. It expires in <span className="text-white font-bold">1 hour</span>.
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
          Reset your <span className="text-primary">password</span>
        </h2>
        <p className="text-sm text-gray-500 text-center mt-2 mb-8">We&apos;ll email you a secure reset link</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 flex items-center gap-2">
              <Mail size={12} className="text-primary" /> Registered Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-black/50 border-primary/20 focus:border-primary transition-all duration-300"
              placeholder="you@example.com"
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
            <p className="text-error text-sm bg-error/10 p-3 rounded-lg border border-error/20">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <Link href="/login" className="text-gray-500 text-sm hover:text-primary transition-colors flex items-center justify-center gap-2">
            <ArrowLeft size={14} /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
