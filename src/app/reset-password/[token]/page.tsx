"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Lock, ShieldAlert, CheckCircle } from "lucide-react";
import CaptchaInput from "@/components/CaptchaInput";

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, captchaAnswer, captchaToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Reset failed");
      } else {
        setSuccess(true);
      }
    } catch {
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
            <CheckCircle size={32} className="text-accent" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-accent">Access restored</h2>
          <p className="text-gray-400 mb-8 leading-relaxed text-sm">
            Your password has been reset successfully. You can now log in with your new credentials.
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
          Set a new <span className="text-accent">password</span>
        </h2>
        <p className="text-sm text-gray-500 text-center mt-2 mb-8">Choose a strong password for your account</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 flex items-center gap-2">
              <Lock size={12} className="text-accent" /> New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-black/50 border-accent/10 focus:border-accent transition-all duration-300"
              placeholder="At least 8 characters"
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 flex items-center gap-2">
              <Lock size={12} className="text-accent" /> Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-black/50 border-accent/10 focus:border-accent transition-all duration-300"
              placeholder="Repeat your password"
              required
              minLength={6}
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
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
