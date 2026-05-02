"use client";

import { useState } from "react";
import { X, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UpgradeModal({ isOpen, onClose, onSuccess }: UpgradeModalProps) {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setMessage({ type: "error", text: "Please enter an upgrade code" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/user/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          code: code.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: "error", text: data.error || "Failed to upgrade account" });
        return;
      }

      setMessage({ type: "success", text: data.message });
      setTimeout(() => {
        setCode("");
        setMessage(null);
        onClose();
        onSuccess();
      }, 2000);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "An error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-primary/30 rounded-lg p-6 max-w-md w-full mx-4 shadow-glow-primary">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-primary glitch-text tracking-widest uppercase">Upgrade Account</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <p className="text-gray-400 text-xs sm:text-sm mb-4 font-mono uppercase tracking-tight">
          Enter your transaction ID or upgrade code provided by the club authority.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="CSC-XXXXXX"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-4 py-2 bg-black/40 border border-border-color rounded text-white placeholder-gray-600 focus:outline-none focus:border-primary"
            disabled={isLoading}
          />

          {message && (
            <div
              className={`flex items-center gap-2 p-3 rounded text-[10px] font-mono uppercase ${
                message.type === "success"
                  ? "bg-accent/10 border border-accent/30 text-accent"
                  : "bg-error/10 border border-error/30 text-error"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle size={14} />
              ) : (
                <AlertCircle size={14} />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border-color rounded text-gray-300 hover:bg-white/5 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-background rounded font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              {isLoading ? "Processing..." : "Upgrade"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
