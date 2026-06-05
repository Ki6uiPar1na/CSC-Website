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
        <div className="card shadow-glow-primary border-primary/50 p-8">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-primary uppercase tracking-widest">Check Your Inbox</h2>
          <p className="text-gray-400 mb-8 leading-relaxed text-sm">
            If an account with that email exists, we've sent a password reset link. It expires in <span className="text-white font-bold">1 hour</span>.
          </p>
          <Link href="/login" className="block w-full py-3 font-bold text-lg tracking-[0.3em]">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4 sm:py-20">
      <div className="card shadow-glow-primary border-primary/50">
        <h2 className="text-2xl font-bold mb-8 text-center glitch-text tracking-widest uppercase">Reset Access</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase text-gray-500 tracking-[0.2em] flex items-center gap-2">
              <Mail size={12} className="text-primary" /> Registered Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-black/50 border-primary/20 focus:border-primary transition-all duration-300"
              placeholder="CONTACT@SECURE.NET"
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
            <p className="text-error text-xs font-mono bg-error/10 p-3 rounded border border-error/20">
              [!] ERROR: {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 font-bold text-lg tracking-[0.3em] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "PROCESSING..." : "SEND RESET LINK"}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <Link href="/login" className="text-gray-500 text-sm hover:text-primary transition-colors flex items-center justify-center gap-2">
            <ArrowLeft size={14} /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
