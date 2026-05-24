"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check, X, Loader2, AlertCircle } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { useMessage, useLoading } from "@/lib/admin-hooks";
import { PaymentRequest } from "@/lib/admin-types";
import { formatDate, formatPrice } from "@/lib/admin-utils";

export default function PaymentRequestsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [showRejectionReason, setShowRejectionReason] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const { loading: fetchLoading, setLoading: setFetchLoading } = useLoading(true);
  const { loading: actionLoading, setLoading: setActionLoading } = useLoading();
  const { message, showMessage } = useMessage();

  const userRole = session?.user ? (session.user as any).role : null;

  useEffect(() => {
    fetchRequests();
  }, [currentPage]);

  const fetchRequests = async () => {
    setFetchLoading(true);
    try {
      const res = await fetch(`/api/admin/payment-requests?page=${currentPage}&limit=15`);
      const data = await res.json();
      
      if (!res.ok) {
        if (data.error === "Admin access required") {
          router.push(userRole === 2 ? "/admin" : "/");
          return;
        }
        throw new Error(data.error || "Failed to fetch payment requests");
      }
      
      setRequests(data.requests || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    if (!confirm("Approve this payment?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/payment-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      showMessage("success", "Payment approved");
      fetchRequests();
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: number) => {
    if (!rejectionReason.trim()) {
      showMessage("error", "Please provide a rejection reason");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/payment-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", rejection_reason: rejectionReason }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      showMessage("success", "Payment rejected");
      setShowRejectionReason(null);
      setRejectionReason("");
      fetchRequests();
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");

  return (
    <div>
      <AdminPageHeader
        title="Payment Requests"
        icon={<span>💰</span>}
        count={pendingRequests.length}
        message={message}
      />

      {fetchLoading ? (
        <div className="text-center py-12">
          <Loader2 className="animate-spin mx-auto mb-4" size={32} />
          <p className="text-gray-400">Loading payment requests...</p>
        </div>
      ) : pendingRequests.length === 0 ? (
        <div className="card text-center py-12">
          <AlertCircle size={32} className="mx-auto mb-4 text-gray-500" />
          <p className="text-gray-400">No pending payment requests</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingRequests.map((request) => (
            <div key={request.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-white">{request.username}</p>
                  <p className="text-sm text-gray-400">{request.email}</p>
                </div>
                <span className="px-3 py-1 bg-yellow-900/30 text-yellow-400 text-xs rounded-full">
                  Pending
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-gray-500">Plan</p>
                  <p className="text-white font-medium">{request.plan}</p>
                </div>
                <div>
                  <p className="text-gray-500">Amount</p>
                  <p className="text-white font-medium">{formatPrice(request.amount)} TK</p>
                </div>
                <div>
                  <p className="text-gray-500">Method</p>
                  <p className="text-white font-medium">{request.payment_method}</p>
                </div>
                <div>
                  <p className="text-gray-500">Transaction ID</p>
                  <p className="text-white font-medium text-xs truncate">{request.transaction_id}</p>
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-4">Requested: {formatDate(request.created_at)}</p>

              {showRejectionReason === request.id ? (
                <div className="space-y-2 mb-4">
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Reason for rejection..."
                    className="input w-full resize-none"
                    rows={2}
                    disabled={actionLoading}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowRejectionReason(null);
                        setRejectionReason("");
                      }}
                      className="btn btn-sm btn-secondary flex-1"
                      disabled={actionLoading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      className="btn btn-sm btn-error flex-1"
                      disabled={actionLoading}
                    >
                      Confirm Reject
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(request.id)}
                    className="btn btn-sm btn-success flex-1"
                    disabled={actionLoading}
                  >
                    <Check size={16} /> Approve
                  </button>
                  <button
                    onClick={() => setShowRejectionReason(request.id)}
                    className="btn btn-sm btn-error flex-1"
                    disabled={actionLoading}
                  >
                    <X size={16} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
          >
            Previous
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>Page {currentPage} of {totalPages}</span>
          </div>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
