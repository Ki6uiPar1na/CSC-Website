"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trash2, AlertCircle, Loader2, ChevronRight } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { useMessage, useLoading } from "@/lib/admin-hooks";
import { Module } from "@/lib/admin-types";
import { formatDate } from "@/lib/admin-utils";

export default function ModulesPage() {
  const router = useRouter();
  const [modules, setModules] = useState<Module[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [formData, setFormData] = useState({ 
    title: "", 
    description: "", 
    is_premium: false, 
    completion_bonus_points: 100 
  });
  const { loading: fetchLoading, setLoading: setFetchLoading } = useLoading(true);
  const { loading: actionLoading, setLoading: setActionLoading } = useLoading();
  const { loading: formLoading, setLoading: setFormLoading } = useLoading();
  const { message, showMessage } = useMessage();

  useEffect(() => {
    fetchModulesData();
  }, []);

  const fetchModulesData = async () => {
    setFetchLoading(true);
    try {
      const res = await fetch("/api/admin/modules");
      const data = await res.json();
      const modulesList = data.modules || [];
      setModules(modulesList);
      
      // Handle ?edit=ID from URL
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get("edit");
        if (editId) {
          const moduleToEdit = modulesList.find((m: Module) => m.id === parseInt(editId));
          if (moduleToEdit) handleEdit(moduleToEdit);
        }
      }
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setFetchLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", is_premium: false, completion_bonus_points: 100 });
    setEditingModule(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      showMessage("error", "Module title is required");
      return;
    }

    setFormLoading(true);
    try {
      const url = "/api/admin/modules";
      const method = editingModule ? "PUT" : "POST";
      const body = editingModule ? { ...formData, moduleId: editingModule.id } : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save module");
      showMessage("success", editingModule ? "Module updated" : "Module created");
      resetForm();
      fetchModulesData();
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (module: Module) => {
    setEditingModule(module);
    setFormData({ 
      title: module.title, 
      description: module.description,
      is_premium: !!module.is_premium,
      completion_bonus_points: module.completion_bonus_points
    });
    setShowForm(true);
  };

  const handleDelete = async (module: Module) => {
    if (!confirm(`Delete "${module.title}"?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/modules/${module.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      showMessage("success", "Module deleted");
      fetchModulesData();
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Modules"
        icon={<span>📚</span>}
        count={modules.length}
        actionButton={{
          label: "Create Module",
          onClick: () => {
            resetForm();
            setShowForm(true);
          },
        }}
        message={message}
      />

      {fetchLoading ? (
        <div className="text-center py-12">
          <Loader2 className="animate-spin mx-auto mb-4" size={32} />
          <p className="text-gray-400">Loading modules...</p>
        </div>
      ) : modules.length === 0 ? (
        <div className="card text-center py-12">
          <AlertCircle size={32} className="mx-auto mb-4 text-gray-500" />
          <p className="text-gray-400 mb-4">No modules yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <Plus size={18} /> Create First Module
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {modules.map((module) => (
            <div key={module.id} className="card flex items-center justify-between hover:border-primary/50 transition-colors group">
              <div 
                className="flex-1 cursor-pointer"
                onClick={() => router.push(`/admin/modules/${module.id}`)}
              >
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors">{module.title}</h3>
                  {module.is_premium && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 font-bold uppercase">Premium</span>
                  )}
                </div>
                {module.description && (
                  <p className="text-sm text-gray-400 mt-1 line-clamp-1">{module.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Completion Bonus: {module.completion_bonus_points} pts • Created: {formatDate(module.created_at)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/admin/modules/${module.id}`)}
                  className="btn btn-sm btn-secondary"
                  title="Manage Lessons"
                >
                  Lessons
                </button>
                <button
                  onClick={() => handleEdit(module)}
                  className="btn btn-sm btn-secondary"
                  disabled={actionLoading}
                  title="Edit module"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(module)}
                  className="btn btn-sm btn-error"
                  disabled={actionLoading}
                  title="Delete module"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingModule ? "Edit Module" : "Create Module"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Module name"
                  className="input w-full"
                  disabled={formLoading}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Module description"
                  className="input w-full resize-none"
                  rows={3}
                  disabled={formLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Bonus Points</label>
                  <input
                    type="number"
                    value={formData.completion_bonus_points}
                    onChange={(e) => setFormData({ ...formData, completion_bonus_points: parseInt(e.target.value) || 0 })}
                    className="input w-full"
                    disabled={formLoading}
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded bg-black/40 border border-border-color w-full">
                    <input 
                      type="checkbox" 
                      checked={formData.is_premium}
                      onChange={(e) => setFormData({ ...formData, is_premium: e.target.checked })}
                      className="checkbox checkbox-primary"
                    />
                    <span className="text-sm">Premium</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn btn-secondary"
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} /> Saving...
                    </>
                  ) : (
                    "Save Module"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
