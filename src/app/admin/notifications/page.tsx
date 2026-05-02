"use client";

import { useState } from "react";
import { Send, Loader2, AlertCircle } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { useMessage, useLoading } from "@/lib/admin-hooks";

export default function NotificationsPage() {
  const [formData, setFormData] = useState({
    type: "info",
    title: "",
    message: "",
    recipients: "all",
  });

  const { loading: formLoading, setLoading: setFormLoading } = useLoading();
  const { message, showMessage } = useMessage();
  const [sentCount, setSentCount] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.message.trim()) {
      showMessage("error", "Title and message are required");
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formData.type,
          title: formData.title,
          message: formData.message,
          recipients: formData.recipients,
        }),
      });

      if (!res.ok) throw new Error("Failed to send notification");
      const data = await res.json();
      setSentCount(data.recipients_count);
      showMessage("success", `Notification sent to ${data.recipients_count} users`);

      // Reset form
      setFormData({
        type: "info",
        title: "",
        message: "",
        recipients: "all",
      });
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Notifications"
        icon={<span>🔔</span>}
        message={message}
      />

      <div className="max-w-2xl">
        {sentCount !== null && (
          <div className="card mb-6 bg-green-900/10 border-green-500/30">
            <p className="text-green-400 flex items-center gap-2">
              <span>✓</span>
              Notification successfully sent to {sentCount} users
            </p>
          </div>
        )}

        <div className="card">
          <h2 className="text-xl font-bold mb-6">Send Broadcast Notification</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <div className="grid grid-cols-4 gap-2">
                {["info", "success", "warning", "error"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, type })}
                    className={`p-3 rounded-lg text-center font-medium transition-all ${
                      formData.type === type
                        ? "bg-primary text-white ring-2 ring-primary/50"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                    disabled={formLoading}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Recipients</label>
              <select
                value={formData.recipients}
                onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                className="input w-full"
                disabled={formLoading}
              >
                <option value="all">All Users</option>
                <option value="premium">Premium Users Only</option>
                <option value="free">Free Users Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Notification title"
                className="input w-full"
                disabled={formLoading}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Message *</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Notification message"
                className="input w-full resize-none"
                rows={5}
                disabled={formLoading}
              />
              <p className="text-xs text-gray-500 mt-2">{formData.message.length} / 500 characters</p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                disabled={formLoading}
              >
                {formLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> Sending...
                  </>
                ) : (
                  <>
                    <Send size={18} /> Send Notification
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 p-4 bg-blue-900/10 border border-blue-500/20 rounded-lg">
            <p className="text-blue-400 text-sm flex items-start gap-2">
              <span>ℹ️</span>
              <span>Notifications are sent in real-time to all connected users. Offline users will see them on next login.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
