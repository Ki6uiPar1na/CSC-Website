"use client";

import { useEffect, useState } from "react";
import { Send, PenSquare, Trash2, Loader2, Bell, X, Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { useMessage, useLoading } from "@/lib/admin-hooks";

type Notification = {
  id: number;
  user_id: number | null;
  type: string;
  title: string;
  message: string;
  is_read: number;
  target_audience: string;
  created_at: string;
  username: string | null;
};

type AudienceFilter = "all" | "premium" | "non_premium";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { loading, setLoading } = useLoading(true);
  const { message, showMessage } = useMessage();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    type: "broadcast",
    title: "",
    message: "",
    recipients: "all",
  });
  const { loading: createLoading, setLoading: setCreateLoading } = useLoading();

  const [editNotification, setEditNotification] = useState<Notification | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    message: "",
    type: "",
    target_audience: "",
  });
  const { loading: editLoading, setLoading: setEditLoading } = useLoading();

  useEffect(() => {
    fetchNotifications();
  }, [audienceFilter, currentPage]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/notifications?audience=${audienceFilter}&page=${currentPage}&limit=15`);
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const data = await res.json();
      setNotifications(data.notifications || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const audienceLabel = (audience: string) => {
    const labels: Record<string, string> = {
      all_users: "All Users",
      premium_users: "Premium",
      non_premium_users: "Free",
      user: "Personal",
    };
    return labels[audience] || audience;
  };

  const typeBadge = (type: string) => {
    const styles: Record<string, string> = {
      broadcast: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      system: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      event_update: "bg-green-500/10 text-green-400 border-green-500/20",
      resource_update: "bg-teal-500/10 text-teal-400 border-teal-500/20",
      challenge_update: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      payment_approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      payment_rejected: "bg-red-500/10 text-red-400 border-red-500/20",
      premium_activated: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    };
    return styles[type] || "bg-gray-500/10 text-gray-400 border-gray-500/20";
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.message.trim()) {
      showMessage("error", "Title and message are required");
      return;
    }

    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: createForm.type,
          title: createForm.title,
          message: createForm.message,
          recipients: createForm.recipients,
        }),
      });
      if (!res.ok) throw new Error("Failed to send notification");
      const data = await res.json();
      showMessage("success", `Notification sent (${data.recipients_count} recipients)`);
      setCreateForm({ type: "broadcast", title: "", message: "", recipients: "all" });
      setShowCreateForm(false);
      fetchNotifications();
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEdit = (notif: Notification) => {
    setEditNotification(notif);
    setEditForm({
      title: notif.title,
      message: notif.message,
      type: notif.type,
      target_audience: notif.target_audience,
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.title.trim() || !editForm.message.trim()) {
      showMessage("error", "Title and message are required");
      return;
    }

    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/notifications/${editNotification!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("Failed to update notification");
      showMessage("success", "Notification updated");
      setEditNotification(null);
      fetchNotifications();
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (notif: Notification) => {
    if (!confirm(`Delete notification "${notif.title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/notifications/${notif.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete notification");
      setNotifications(notifications.filter((n) => n.id !== notif.id));
      setTotal((t) => t - 1);
      showMessage("success", "Notification deleted");
    } catch (error: any) {
      showMessage("error", error.message);
    }
  };

  const tabs: { key: AudienceFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "premium", label: "Premium" },
    { key: "non_premium", label: "Free" },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Notifications"
        icon={<Bell size={24} />}
        count={total}
        actionButton={{
          label: showCreateForm ? "Close Form" : "New Broadcast",
          onClick: () => setShowCreateForm(!showCreateForm),
          icon: showCreateForm ? <X size={16} /> : <Plus size={16} />,
        }}
        message={message}
      />

      {/* Create Broadcast Form */}
      {showCreateForm && (
        <div className="card mb-8 border-primary/20">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Send size={18} className="text-primary" />
            Send Broadcast Notification
          </h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={createForm.type}
                  onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                  className="input w-full"
                  disabled={createLoading}
                >
                  <option value="broadcast">Broadcast</option>
                  <option value="system">System</option>
                  <option value="event_update">Event Update</option>
                  <option value="resource_update">Resource Update</option>
                  <option value="challenge_update">Challenge Update</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Recipients</label>
                <select
                  value={createForm.recipients}
                  onChange={(e) => setCreateForm({ ...createForm, recipients: e.target.value })}
                  className="input w-full"
                  disabled={createLoading}
                >
                  <option value="all">All Users</option>
                  <option value="premium">Premium Only</option>
                  <option value="free">Free Only</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="Notification title"
                className="input w-full"
                disabled={createLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <textarea
                value={createForm.message}
                onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
                placeholder="Notification message"
                className="input w-full resize-none"
                rows={4}
                disabled={createLoading}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="btn btn-primary flex items-center gap-2"
                disabled={createLoading}
              >
                {createLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Send Notification
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setAudienceFilter(tab.key); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              audienceFilter === tab.key
                ? "bg-primary text-black"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications Table */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 size={32} className="animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-400">Loading notifications...</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold whitespace-nowrap">Type</th>
                  <th className="text-left py-3 px-4 font-semibold">Title</th>
                  <th className="text-left py-3 px-4 font-semibold hidden md:table-cell">Message</th>
                  <th className="text-left py-3 px-4 font-semibold whitespace-nowrap">Audience</th>
                  <th className="text-left py-3 px-4 font-semibold whitespace-nowrap hidden lg:table-cell">User</th>
                  <th className="text-left py-3 px-4 font-semibold whitespace-nowrap hidden lg:table-cell">Date</th>
                  <th className="text-left py-3 px-4 font-semibold whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((notif) => (
                  <tr
                    key={notif.id}
                    className="border-b border-gray-800/50 hover:bg-gray-900/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${typeBadge(notif.type)}`}>
                        {notif.type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium max-w-[200px] truncate" title={notif.title}>
                      {notif.title}
                    </td>
                    <td className="py-3 px-4 text-gray-400 max-w-[300px] truncate hidden md:table-cell" title={notif.message}>
                      {notif.message}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        notif.target_audience === "premium_users"
                          ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                          : notif.target_audience === "non_premium_users"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          : notif.target_audience === "user"
                          ? "bg-gray-500/10 text-gray-400 border-gray-500/20"
                          : "bg-green-500/10 text-green-400 border-green-500/20"
                      }`}>
                        {audienceLabel(notif.target_audience)}
                      </span>
                      {notif.is_read === 0 && notif.target_audience !== "user" && (
                        <span className="ml-1 text-[10px] text-orange-400 font-bold">(unread)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs hidden lg:table-cell">
                      {notif.username || "-"}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap hidden lg:table-cell">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(notif)}
                          className="p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded transition-colors"
                          title="Edit notification"
                        >
                          <PenSquare size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(notif)}
                          className="p-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded transition-colors"
                          title="Delete notification"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {notifications.length === 0 && (
            <p className="text-center text-gray-500 py-8">No notifications found</p>
          )}
        </div>
      )}

      {/* Pagination */}
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
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .map((p, idx, arr) => (
                <span key={p} className="flex items-center gap-1">
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1">...</span>}
                  <button
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                      currentPage === p
                        ? "bg-primary text-black"
                        : "text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {p}
                  </button>
                </span>
              ))}
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

      {/* Edit Modal */}
      {editNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <PenSquare size={18} className="text-primary" />
                Edit Notification
              </h3>
              <button
                onClick={() => setEditNotification(null)}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="input w-full"
                    disabled={editLoading}
                  >
                    <option value="broadcast">Broadcast</option>
                    <option value="system">System</option>
                    <option value="event_update">Event Update</option>
                    <option value="resource_update">Resource Update</option>
                    <option value="challenge_update">Challenge Update</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Target Audience</label>
                  <select
                    value={editForm.target_audience}
                    onChange={(e) => setEditForm({ ...editForm, target_audience: e.target.value })}
                    className="input w-full"
                    disabled={editLoading || editNotification.target_audience === "user"}
                  >
                    <option value="all_users">All Users</option>
                    <option value="premium_users">Premium Only</option>
                    <option value="non_premium_users">Free Only</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="input w-full"
                  disabled={editLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <textarea
                  value={editForm.message}
                  onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                  className="input w-full resize-none"
                  rows={4}
                  disabled={editLoading}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                  disabled={editLoading}
                >
                  {editLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <PenSquare size={16} /> Save Changes
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditNotification(null)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
