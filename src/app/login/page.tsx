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
      <div className="card shadow-glow-primary border-primary/50">
        <h2 className="text-2xl font-bold mb-8 text-center glitch-text tracking-widest uppercase">Member Login</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase text-gray-500 tracking-[0.2em] flex items-center gap-2">
              <User size={12} className="text-primary" /> Username / Email
            </label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              className="bg-black/50 border-primary/20 focus:border-primary transition-all duration-300"
              placeholder="USERNAME / EMAIL"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase text-gray-500 tracking-[0.2em] flex items-center gap-2">
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
              <Link href="/forgot-password" className="text-[10px] font-mono text-gray-500 hover:text-primary transition-colors">
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
            <p className="text-error text-xs font-mono bg-error/10 p-3 rounded border border-error/20">
              [!] ERROR: {error}
            </p>
          )}

          <button type="submit" className="w-full py-3 font-bold text-lg tracking-[0.3em]">
            INITIALIZE
          </button>
        </form>
        
        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <p className="text-gray-500 text-sm">
            New operative? <Link href="/register" className="text-primary font-bold hover:underline underline-offset-4 decoration-primary/50 ml-1 tracking-widest uppercase text-xs">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
