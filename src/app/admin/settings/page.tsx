"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Save, Loader2 } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { useMessage, useLoading } from "@/lib/admin-hooks";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [settings, setSettings] = useState({
    site_name: "CTF Platform",
    site_description: "Capture The Flag Learning Platform",
    maintenance_mode: false,
    max_file_upload_size: 10,
  });

  const { loading: fetchLoading, setLoading: setFetchLoading } = useLoading(true);
  const { loading: saveLoading, setLoading: setSaveLoading } = useLoading();
  const { message, showMessage } = useMessage();

  const userRole = session?.user ? (session.user as any).role : null;

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setFetchLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      
      if (!res.ok) {
        if (data.error === "Admin access required") {
          router.push(userRole === 2 ? "/admin" : "/");
          return;
        }
        throw new Error(data.error || "Failed to fetch settings");
      }
      
      if (data.settings) {
        // Parse numeric values correctly
        const parsedSettings = {
          ...data.settings,
          max_file_upload_size: parseInt(data.settings.max_file_upload_size) || 10,
          maintenance_mode: data.settings.maintenance_mode === "true" || data.settings.maintenance_mode === "1",
        };
        setSettings(parsedSettings);
      }
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      showMessage("success", "Settings saved successfully");
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setSaveLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div>
        <AdminPageHeader title="Settings" icon={<span>⚙️</span>} message={message} />
        <div className="text-center py-12">
          <Loader2 className="animate-spin mx-auto mb-4" size={32} />
          <p className="text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader title="Settings" icon={<span>⚙️</span>} message={message} />

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-bold mb-4">Site Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Site Name</label>
                <input
                  type="text"
                  value={settings.site_name}
                  onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                  className="input w-full"
                  disabled={saveLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Site Description</label>
                <textarea
                  value={settings.site_description}
                  onChange={(e) => setSettings({ ...settings, site_description: e.target.value })}
                  className="input w-full resize-none"
                  rows={3}
                  disabled={saveLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Max File Upload (MB)</label>
                <input
                  type="number"
                  value={settings.max_file_upload_size}
                  onChange={(e) => setSettings({ ...settings, max_file_upload_size: parseInt(e.target.value) || 10 })}
                  min="1"
                  max="500"
                  className="input w-full"
                  disabled={saveLoading}
                />
              </div>
            </div>
          </div>

          <div className="card bg-red-900/10 border-red-500/20">
            <h2 className="text-lg font-bold mb-4 text-red-400">Maintenance</h2>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.maintenance_mode}
                onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                className="rounded"
                disabled={saveLoading}
              />
              <span>Enable Maintenance Mode</span>
            </label>
            <p className="text-xs text-red-400 mt-2">When enabled, only admins can access the platform.</p>
          </div>

          <button type="submit" className="btn btn-primary w-full flex items-center justify-center gap-2" disabled={saveLoading}>
            {saveLoading ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Saving...
              </>
            ) : (
              <>
                <Save size={18} /> Save Settings
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
