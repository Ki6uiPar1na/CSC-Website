"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw } from "lucide-react";

interface CaptchaInputProps {
  onVerify: (answer: string, token: string) => void;
  error?: boolean;
}

export default function CaptchaInput({ onVerify, error }: CaptchaInputProps) {
  const [captchaSvg, setCaptchaSvg] = useState<string>("");
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  
  // Use a ref for onVerify to prevent dependency loops
  const onVerifyRef = useRef(onVerify);
  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  const fetchCaptcha = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/captcha");
      const data = await res.json();
      setCaptchaSvg(data.svg);
      setCaptchaToken(data.token);
      setUserAnswer("");
      // Call with empty answer to initialize token in parent
      onVerifyRef.current("", data.token); 
    } catch (err) {
      console.error("Failed to fetch captcha", err);
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies, won't trigger on parent re-renders

  useEffect(() => {
    fetchCaptcha();
  }, [fetchCaptcha]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserAnswer(val);
    onVerifyRef.current(val, captchaToken);
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-mono uppercase text-gray-500 tracking-[0.2em] flex items-center gap-2">
        Verification Required
      </label>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 bg-black/40 border border-border-color p-2 rounded-sm h-14 overflow-hidden relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
              <RefreshCw size={20} className="animate-spin text-primary" />
            </div>
          ) : (
            <div 
              className="flex-1 h-full invert opacity-80 hover:opacity-100 transition-opacity"
              dangerouslySetInnerHTML={{ __html: captchaSvg }} 
            />
          )}
          <button
            type="button"
            onClick={fetchCaptcha}
            className="p-2 border-none hover:bg-white/5 h-full flex items-center justify-center"
            title="Refresh Captcha"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <input
          type="text"
          value={userAnswer}
          onChange={handleInputChange}
          placeholder="ENTER CAPTCHA"
          className={`py-2.5 ${error ? "border-error focus:border-error" : ""}`}
          required
        />
      </div>
    </div>
  );
}
