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
        <div className="card shadow-glow-accent border-accent/30 p-8">
          <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <User size={32} className="text-accent" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-accent uppercase tracking-widest">Recruitment Received</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Your application has been logged. Please wait for the <span className="text-white font-bold">Admin</span> to approve your access.
          </p>
          <Link href="/login" className="accent block w-full py-3 font-bold text-lg tracking-[0.3em]">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4 sm:py-20">
      <div className="card shadow-glow-accent border-accent/30">
        <h2 className="text-2xl font-bold mb-8 text-center glitch-text tracking-widest uppercase text-accent">New Recruitment</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase text-gray-500 tracking-[0.2em] flex items-center gap-2">
              <User size={12} className="text-accent" /> Username
            </label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              className="bg-black/50 border-accent/10 focus:border-accent transition-all duration-300 py-2.5"
              placeholder="UNIQUE_HANDLE"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase text-gray-500 tracking-[0.2em] flex items-center gap-2">
              <Mail size={12} className="text-accent" /> Email
            </label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="bg-black/50 border-accent/10 focus:border-accent transition-all duration-300 py-2.5"
              placeholder="CONTACT@SECURE.NET"
              required
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase text-gray-500 tracking-[0.2em] flex items-center gap-2">
              <Lock size={12} className="text-accent" /> Password
            </label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="bg-black/50 border-accent/10 focus:border-accent transition-all duration-300 py-2.5"
              placeholder="SECURE_KEY"
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
            <div className="text-error text-[10px] font-mono bg-error/5 p-3 rounded border border-error/20 flex items-start gap-2">
              <ShieldAlert size={14} className="shrink-0" />
              <span>[!] ALERT: {error}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="accent w-full py-3 font-bold text-lg tracking-[0.3em] mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "PROCESSING..." : "REGISTER"}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-gray-500 text-xs sm:text-sm">
            Already registered? <Link href="/login" className="text-accent font-bold hover:underline underline-offset-4 decoration-accent/50 ml-1 tracking-widest uppercase">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
