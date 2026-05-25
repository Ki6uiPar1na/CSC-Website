"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Link as LinkIcon, Loader2, AlertCircle } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { useMessage, useLoading } from "@/lib/admin-hooks";
import { Resource } from "@/lib/admin-types";
import { formatDate } from "@/lib/admin-utils";

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "tutorial",
    action: "Read",
    urls: [{ url: "", display_name: "" }],
  });

  const { loading: fetchLoading, setLoading: setFetchLoading } = useLoading(true);
  const { loading: actionLoading, setLoading: setActionLoading } = useLoading();
  const { loading: formLoading, setLoading: setFormLoading } = useLoading();
  const { message, showMessage } = useMessage();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchResourcesData();
  }, [currentPage]);

  const fetchResourcesData = async () => {
    setFetchLoading(true);
    try {
      const res = await fetch(`/api/admin/resources?page=${currentPage}&limit=15`);
      const data = await res.json();
      setResources(data.resources || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setFetchLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", category: "tutorial", action: "Read", urls: [{ url: "", display_name: "" }] });
    setEditingResource(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      showMessage("error", "Title is required");
      return;
    }

    if (formData.urls.every((u) => !u.url.trim())) {
      showMessage("error", "At least one URL is required");
      return;
    }

    setFormLoading(true);
    try {
      const method = editingResource ? "PUT" : "POST";
      const filteredUrls = formData.urls.filter((u) => u.url.trim()).map((u, i) => ({ ...u, url_order: i }));
      const body: any = {
        ...formData,
        url: filteredUrls[0]?.url || "",
        urls: filteredUrls,
      };
      if (editingResource) body.resourceId = editingResource.id;

      const res = await fetch("/api/admin/resources", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save resource");
      showMessage("success", editingResource ? "Resource updated" : "Resource created");
      resetForm();
      fetchResourcesData();
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    setFormData({
      title: resource.title,
      description: resource.description,
      category: resource.category,
      action: resource.action || "Read",
      urls: (resource.urls || []).map((u) => ({ url: u.url, display_name: u.display_name || "" })),
    });
    setShowForm(true);
  };

  const handleDelete = async (resource: Resource) => {
    if (!confirm(`Delete "${resource.title}"?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/resources", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: resource.id }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      showMessage("success", "Resource deleted");
      fetchResourcesData();
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const categories = ["tutorial", "documentation", "tool", "video", "article", "course"];
  const actions = ["Read", "Watch", "Tools", "Practice", "Article", "Course"];

  return (
    <div>
      <AdminPageHeader
        title="Resources"
        icon={<span>📖</span>}
        count={resources.length}
        actionButton={{
          label: "Add Resource",
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
          <p className="text-gray-400">Loading resources...</p>
        </div>
      ) : resources.length === 0 ? (
        <div className="card text-center py-12">
          <AlertCircle size={32} className="mx-auto mb-4 text-gray-500" />
          <p className="text-gray-400 mb-4">No resources yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <Plus size={18} /> Add First Resource
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {resources.map((resource) => (
            <div key={resource.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{resource.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    <span className="inline-block px-2 py-1 bg-primary/20 rounded text-primary text-xs mr-2">
                      {resource.category}
                    </span>
                    <span className="inline-block px-2 py-1 bg-accent/20 rounded text-accent text-xs mr-2">
                      {resource.action || "Read"}
                    </span>
                    Created: {formatDate(resource.created_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(resource)}
                    className="btn btn-sm btn-secondary"
                    disabled={actionLoading}
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(resource)}
                    className="btn btn-sm btn-error"
                    disabled={actionLoading}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <p className="text-gray-400 text-sm mb-3">{resource.description}</p>

              {resource.urls && resource.urls.length > 0 && (
                <div className="space-y-2">
                  {resource.urls.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
                    >
                      <LinkIcon size={14} />
                      <span className="truncate">{link.display_name || link.url}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="card w-full max-w-2xl my-4">
            <h2 className="text-xl font-bold mb-4">{editingResource ? "Edit Resource" : "Add Resource"}</h2>

            <form onSubmit={handleSubmit} className="space-y-4 max-h-[500px] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Resource name"
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
                  placeholder="What is this resource about?"
                  className="input w-full resize-none"
                  rows={3}
                  disabled={formLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input w-full"
                  disabled={formLoading}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Action</label>
                <select
                  value={formData.action}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  className="input w-full"
                  disabled={formLoading}
                >
                  {actions.map((act) => (
                    <option key={act} value={act}>{act}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Links *</label>
                {formData.urls.map((link, idx) => (
                  <div key={idx} className="space-y-2 mb-3 p-3 bg-gray-900/50 rounded">
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => {
                        const newUrls = [...formData.urls];
                        newUrls[idx].url = e.target.value;
                        setFormData({ ...formData, urls: newUrls });
                      }}
                      placeholder="https://example.com"
                      className="input w-full"
                      disabled={formLoading}
                    />
                    <input
                      type="text"
                      value={link.display_name}
                      onChange={(e) => {
                        const newUrls = [...formData.urls];
                        newUrls[idx].display_name = e.target.value;
                        setFormData({ ...formData, urls: newUrls });
                      }}
                      placeholder="Display name (optional)"
                      className="input w-full"
                      disabled={formLoading}
                    />
                    {formData.urls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, urls: formData.urls.filter((_, i) => i !== idx) })}
                        className="btn btn-sm btn-error"
                        disabled={formLoading}
                      >
                        Remove Link
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, urls: [...formData.urls, { url: "", display_name: "" }] })}
                  className="btn btn-sm btn-secondary"
                  disabled={formLoading}
                >
                  Add Another Link
                </button>
              </div>

              <div className="flex gap-2 justify-end">
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
                    "Save Resource"
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
