"use client";

import { useState, useEffect } from "react";
import { X, Loader2, CheckCircle, AlertCircle, CreditCard, Edit2 } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PendingRequest {
  id: number;
  payment_method: string;
  transaction_id: string;
  created_at: string;
}

export default function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
  const [step, setStep] = useState<"plan" | "payment">("plan");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"bkash" | "nagad" | "rocket" | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkPendingRequest();
      setStep("plan");
      setMessage(null);
    }
  }, [isOpen]);

  const checkPendingRequest = async () => {
    setIsFetching(true);
    try {
      const response = await fetch("/api/user/payment");
      if (response.ok) {
        const data = await response.json();
        if (data.pendingRequest) {
          setPendingRequest(data.pendingRequest);
          setPaymentMethod(data.pendingRequest.payment_method as "bkash" | "nagad" | "rocket");
          setTransactionId(data.pendingRequest.transaction_id);
        }
      }
    } catch (error) {
      console.error("Error checking pending request:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const handlePlanSelect = () => {
    setStep("payment");
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!transactionId.trim()) {
      setMessage({ type: "error", text: "Please enter transaction ID" });
      return;
    }

    if (!paymentMethod) {
      setMessage({ type: "error", text: "Please select payment method" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/user/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "2_months",
          amount: 250,
          payment_method: paymentMethod,
          transaction_id: transactionId.trim(),
          requestId: pendingRequest?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: "error", text: data.error || "Payment request failed" });
        return;
      }

      setMessage({
        type: "success",
        text: data.message || "Payment request submitted! Admin will review and approve shortly.",
      });

      setTimeout(() => {
        setTransactionId("");
        setPaymentMethod(null);
        setPendingRequest(null);
        setIsEditing(false);
        setStep("plan");
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-primary/30 rounded-lg max-w-md w-full shadow-glow-primary">
        <div className="flex justify-between items-center p-6 border-b border-primary/20">
          <h2 className="text-xl font-bold text-primary glitch-text tracking-widest uppercase">
            {step === "plan" ? "Premium Plan" : "Complete Payment"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {step === "plan" ? (
            <div className="space-y-4">
              {isFetching && (
                <div className="text-center py-6">
                  <Loader2 size={20} className="animate-spin mx-auto text-primary mb-2" />
                  <p className="text-xs text-gray-400">Checking for existing request...</p>
                </div>
              )}

              {pendingRequest && !isFetching && (
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-300">
                      <p className="font-semibold mb-1">You have a pending payment request</p>
                      <p className="text-xs text-yellow-200">Submitted on {new Date(pendingRequest.created_at).toLocaleDateString()}</p>
                      {!isEditing && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-xs mt-2 px-2 py-1 bg-yellow-600/50 hover:bg-yellow-600 rounded transition-colors flex items-center gap-1 w-fit"
                        >
                          <Edit2 size={12} />
                          Edit Details
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {(!pendingRequest || isEditing) && (
                <>
                  <div className="border border-primary/30 rounded-lg p-4 bg-primary/5 hover:bg-primary/10 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-white">2 Month Premium</h3>
                      <span className="text-xl font-bold text-primary">৳250</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">Get access to all premium modules and challenges</p>
                    <ul className="space-y-1 text-xs text-gray-400 mb-4">
                      <li className="flex items-center gap-2">
                        <span className="text-primary">✓</span> Unlock all premium modules
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-primary">✓</span> Exclusive premium challenges
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-primary">✓</span> Valid for 2 months
                      </li>
                    </ul>
                  </div>

                  <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3 text-xs text-blue-300">
                    💡 Pay using bKash, Nagad, or Rocket. Admin will review and approve your payment.
                  </div>
                </>
              )}

              {pendingRequest && !isEditing && (
                <div className="bg-black/30 border border-border-color rounded p-4 space-y-3 text-xs">
                  <div>
                    <p className="text-gray-500 mb-1">Payment Method</p>
                    <p className="font-semibold uppercase">{pendingRequest.payment_method}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Transaction ID</p>
                    <p className="font-mono text-gray-300 text-xs break-all">{pendingRequest.transaction_id}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-border-color rounded text-gray-300 hover:bg-white/5 transition-colors"
                >
                  {pendingRequest && !isEditing ? "Close" : "Cancel"}
                </button>
                {(!pendingRequest || isEditing) && (
                  <button
                    onClick={handlePlanSelect}
                    className="flex-1 px-4 py-2 bg-primary text-background rounded font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <CreditCard size={16} />
                    Proceed to Pay
                  </button>
                )}
                {pendingRequest && !isEditing && (
                  <button
                    onClick={() => setStep("payment")}
                    className="flex-1 px-4 py-2 bg-primary text-background rounded font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <CreditCard size={16} />
                    Update & Resubmit
                  </button>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-300 uppercase mb-2 block">Select Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {["bkash", "nagad", "rocket"].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(method as "bkash" | "nagad" | "rocket");
                        setMessage(null);
                      }}
                      className={`py-2 px-3 rounded border text-xs font-bold uppercase transition-all ${
                        paymentMethod === method
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-border-color text-gray-400 hover:border-primary/50"
                      }`}
                    >
                      {method === "bkash" ? "bKash" : method === "nagad" ? "Nagad" : "Rocket"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 uppercase mb-2 block">Transaction ID</label>
                <input
                  type="text"
                  placeholder="Enter your transaction ID"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full px-4 py-2 bg-black/40 border border-border-color rounded text-white placeholder-gray-600 focus:outline-none focus:border-primary text-sm"
                  disabled={isLoading}
                />
              </div>

              <div className="bg-black/30 border border-border-color rounded p-3 text-xs">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Plan:</span>
                  <span className="text-white font-semibold">2 Month Premium</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Payment Method:</span>
                  <span className="text-white font-semibold uppercase">
                    {paymentMethod ? (paymentMethod === "bkash" ? "bKash" : paymentMethod === "nagad" ? "Nagad" : "Rocket") : "Not selected"}
                  </span>
                </div>
                <div className="border-t border-border-color/50 pt-2 flex justify-between">
                  <span className="text-gray-400">Total:</span>
                  <span className="text-primary font-bold text-sm">৳250</span>
                </div>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-3 text-xs text-yellow-300">
                ⚠️ {pendingRequest ? "Updated payment request will be sent to admin for review." : "Payment request will be sent to admin for review."} You will be notified once approved.
              </div>

              {message && (
                <div
                  className={`flex items-center gap-2 p-3 rounded text-xs font-mono uppercase ${
                    message.type === "success"
                      ? "bg-accent/10 border border-accent/30 text-accent"
                      : "bg-error/10 border border-error/30 text-error"
                  }`}
                >
                  {message.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  <span>{message.text}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("plan")}
                  className="flex-1 px-4 py-2 border border-border-color rounded text-gray-300 hover:bg-white/5 transition-colors disabled:opacity-50"
                  disabled={isLoading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-background rounded font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  disabled={isLoading || !paymentMethod}
                >
                  {isLoading && <Loader2 size={16} className="animate-spin" />}
                  {isLoading ? "Submitting..." : pendingRequest ? "Update Request" : "Submit Request"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
