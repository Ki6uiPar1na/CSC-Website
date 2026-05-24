"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Copy, Trash2, Loader2, AlertCircle, Search, Filter, CheckCircle2, XCircle, Clock, CreditCard as CardIcon } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { useMessage, useLoading } from "@/lib/admin-hooks";
import { UpgradeCode, CodeStats } from "@/lib/admin-types";
import { formatDate, copyToClipboard } from "@/lib/admin-utils";

export default function UpgradeCodesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [codes, setCodes] = useState<UpgradeCode[]>([]);
  const [stats, setStats] = useState<CodeStats | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "used" | "unused">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [formData, setFormData] = useState({
    count: 1,
    validity_months: 12,
    payment_method: "manual",
    price_tk: 0,
    custom_code: "",
    usage_limit: 1,
    expires_in_days: 30,
  });
  const { loading: fetchLoading, setLoading: setFetchLoading } = useLoading(true);
  const { loading: actionLoading, setLoading: setActionLoading } = useLoading();
  const { loading: formLoading, setLoading: setFormLoading } = useLoading();
  const { message, showMessage } = useMessage();
  const [selectedCodes, setSelectedCodes] = useState<Set<number>>(new Set());

  const userRole = session?.user ? (session.user as any).role : null;

  useEffect(() => {
    fetchCodesData();
  }, [currentPage]);

  const fetchCodesData = async () => {
    setFetchLoading(true);
    try {
      const res = await fetch(`/api/admin/upgrade-codes?page=${currentPage}&limit=15`);
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "Admin access required") {
          router.push(userRole === 2 ? "/admin" : "/");
          return;
        }
        throw new Error(data.error || "Failed to fetch codes");
      }
      setCodes(data.codes || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setStats(data.stats || null);
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setFetchLoading(false);
    }
  };

  const filteredCodes = useMemo(() => {
    return codes.filter(code => {
      const matchesSearch = code.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = 
        filterStatus === "all" ? true :
        filterStatus === "used" ? (code.is_used || (code.usage_limit > 1 && code.usage_count >= code.usage_limit)) :
        !(code.is_used || (code.usage_limit > 1 && code.usage_count >= code.usage_limit));
      return matchesSearch && matchesFilter;
    });
  }, [codes, searchQuery, filterStatus]);

  const resetForm = () => {
    setFormData({ 
      count: 1, 
      validity_months: 12, 
      payment_method: "manual", 
      price_tk: 0,
      custom_code: "",
      usage_limit: 1,
      expires_in_days: 30
    });
    setShowForm(false);
  };

  const handleGenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.custom_code && formData.count < 1) {
      showMessage("error", "Count must be at least 1");
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch("/api/admin/upgrade-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: formData.count,
          validity_months: formData.validity_months,
          custom_code: formData.custom_code || undefined,
          usage_limit: formData.usage_limit,
          expires_in_days: formData.expires_in_days,
          payment_method: formData.payment_method,
          price_tk: formData.price_tk,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate codes");
      }

      showMessage("success", formData.custom_code ? "Custom code added" : `${formData.count} codes generated successfully`);
      resetForm();
      fetchCodesData();
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCode = async (code: UpgradeCode) => {
    if (!confirm(`Delete code ${code.code}?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/upgrade-codes/${code.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      showMessage("success", "Code deleted");
      fetchCodesData();
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleCodeSelection = (id: number) => {
    const newSet = new Set(selectedCodes);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedCodes(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedCodes.size === filteredCodes.length) {
      setSelectedCodes(new Set());
    } else {
      setSelectedCodes(new Set(filteredCodes.map(c => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCodes.size === 0) {
      showMessage("error", "No codes selected");
      return;
    }
    if (!confirm(`Delete ${selectedCodes.size} codes?`)) return;

    setActionLoading(true);
    try {
      const ids = Array.from(selectedCodes);
      // Using Promise.all for faster bulk delete if API supports it or just sequential
      // For now sequential as per original logic but could be optimized
      for (const id of ids) {
        await fetch(`/api/admin/upgrade-codes/${id}`, { method: "DELETE" });
      }
      showMessage("success", `${ids.length} codes deleted`);
      setSelectedCodes(new Set());
      fetchCodesData();
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Upgrade Codes"
        icon={<span>💳</span>}
        count={stats?.total || 0}
        actionButton={{
          label: "Generate Codes",
          onClick: () => {
            resetForm();
            setShowForm(true);
          },
        }}
        message={message}
      />

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Codes</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                <CardIcon size={20} />
              </div>
            </div>
          </div>
          <div className="card bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-sm font-medium">Unused</p>
                <p className="text-3xl font-bold text-green-400 mt-1">{stats.unused}</p>
              </div>
              <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                <CheckCircle2 size={20} />
              </div>
            </div>
          </div>
          <div className="card bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-sm font-medium">Used</p>
                <p className="text-3xl font-bold text-blue-400 mt-1">{stats.total - stats.unused}</p>
              </div>
              <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500">
                <Clock size={20} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-900/50 p-4 rounded-xl border border-gray-800">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Search codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={18} className="text-gray-500 hidden sm:block" />
          <select 
            className="min-w-[140px] w-full sm:w-auto"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="all">All Status</option>
            <option value="unused">Unused Only</option>
            <option value="used">Used Only</option>
          </select>

          {selectedCodes.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="btn btn-error btn-sm whitespace-nowrap"
              disabled={actionLoading}
            >
              <Trash2 size={16} className="mr-1" /> Delete ({selectedCodes.size})
            </button>
          )}
        </div>
      </div>

      {/* Codes Table */}
      <div className="card overflow-hidden p-0 border-gray-800">
        {fetchLoading ? (
          <div className="text-center py-20">
            <Loader2 className="animate-spin mx-auto mb-4 text-primary" size={40} />
            <p className="text-gray-400">Loading codes database...</p>
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className="text-center py-20">
            <AlertCircle size={40} className="mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400 mb-2">No upgrade codes found</p>
            {searchQuery && <p className="text-sm text-gray-500">Try adjusting your search or filters</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-800/50 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold w-12">
                    <input
                      type="checkbox"
                      checked={selectedCodes.size === filteredCodes.length && filteredCodes.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary"
                    />
                  </th>
                  <th className="px-6 py-4 font-semibold">Code</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Usage</th>
                  <th className="px-6 py-4 font-semibold">Duration</th>
                  <th className="px-6 py-4 font-semibold">Created</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredCodes.map((code) => (
                  <tr 
                    key={code.id} 
                    className={`hover:bg-gray-800/30 transition-colors group ${selectedCodes.has(code.id) ? "bg-primary/5" : ""}`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedCodes.has(code.id)}
                        onChange={() => toggleCodeSelection(code.id)}
                        className="rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-sm bg-gray-900 px-2 py-1 rounded text-white border border-gray-700">
                          {code.code}
                        </code>
                        <button
                          onClick={() => {
                            copyToClipboard(code.code);
                            showMessage("success", "Code copied to clipboard");
                          }}
                          className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-800 rounded-md transition-all opacity-0 group-hover:opacity-100"
                          title="Copy Code"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {code.is_used ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Used
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                          Available
                        </span>
                      )}
                      {code.is_custom ? (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          Custom
                        </span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-300">
                          {code.usage_count} / {code.usage_limit}
                        </span>
                        <div className="w-16 h-1 bg-gray-800 rounded-full mt-1 overflow-hidden">
                          <div 
                            className={`h-full ${code.usage_count >= code.usage_limit ? 'bg-red-500' : 'bg-primary'}`} 
                            style={{ width: `${Math.min(100, (code.usage_count / code.usage_limit) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-300">{code.validity_months} Months</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-500">{formatDate(code.created_at)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteCode(code)}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        disabled={actionLoading}
                        title="Delete Code"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Codes Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="card w-full max-w-md bg-gray-900 border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Generate Upgrade Codes</h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-white transition-colors">
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleGenerateCodes} className="space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Special Offer / Custom Code</label>
                <input
                  type="text"
                  placeholder="e.g. EID2026, RAMADAN-SPECIAL"
                  value={formData.custom_code}
                  onChange={(e) => setFormData({ ...formData, custom_code: e.target.value.toUpperCase() })}
                  className="input w-full focus:border-primary font-mono"
                  disabled={formLoading}
                />
                <p className="text-[10px] text-gray-500 mt-1">Leave empty to generate random codes.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {!formData.custom_code && (
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Quantity</label>
                    <input
                      type="number"
                      value={formData.count}
                      onChange={(e) => setFormData({ ...formData, count: Math.max(1, parseInt(e.target.value) || 1) })}
                      min="1"
                      max="100"
                      className="input w-full focus:border-primary"
                      disabled={formLoading}
                    />
                  </div>
                )}

                <div className={formData.custom_code ? "col-span-2" : ""}>
                  <label className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Usage Limit</label>
                  <input
                    type="number"
                    value={formData.usage_limit}
                    onChange={(e) => setFormData({ ...formData, usage_limit: Math.max(1, parseInt(e.target.value) || 1) })}
                    min="1"
                    className="input w-full focus:border-primary"
                    disabled={formLoading}
                  />
                  <p className="text-[10px] text-gray-500 mt-1">How many users can use this code?</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Duration (Mo)</label>
                  <input
                    type="number"
                    value={formData.validity_months}
                    onChange={(e) => setFormData({ ...formData, validity_months: Math.max(1, parseInt(e.target.value) || 1) })}
                    min="1"
                    max="120"
                    className="input w-full focus:border-primary"
                    disabled={formLoading}
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Subscription length.</p>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Expiration (Days)</label>
                  <input
                    type="number"
                    value={formData.expires_in_days}
                    onChange={(e) => setFormData({ ...formData, expires_in_days: Math.max(1, parseInt(e.target.value) || 1) })}
                    min="1"
                    className="input w-full focus:border-primary"
                    disabled={formLoading}
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Code itself expires in.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Payment Source</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full focus:border-primary"
                    disabled={formLoading}
                  >
                    <option value="manual">Manual Transfer</option>
                    <option value="bkash">bKash Merchant</option>                    <option value="nagad">Nagad Merchant</option>
                    <option value="rocket">Rocket Merchant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Price (TK)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">৳</span>
                    <input
                      type="number"
                      value={formData.price_tk}
                      onChange={(e) => setFormData({ ...formData, price_tk: Math.max(0, parseInt(e.target.value) || 0) })}
                      min="0"
                      className="input w-full pl-8 focus:border-primary"
                      disabled={formLoading}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn btn-secondary flex-1"
                  disabled={formLoading}
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1 shadow-lg shadow-primary/20"
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin" size={18} /> Working...
                    </span>
                  ) : (
                    "Create Code(s)"
                  )}
                </button>
              </div>
            </form>
          </div>
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
