"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Loader2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { useMessage, useLoading } from "@/lib/admin-hooks";
import { Challenge, Module, ChallengeFlag, ChallengeUrl } from "@/lib/admin-types";
import { formatDate } from "@/lib/admin-utils";

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [formData, setFormData] = useState({
    module_id: 0,
    title: "",
    description: "",
    max_points: 100,
    min_points: 10,
    decay_limit: 1000,
    difficulty_level: "medium",
    prerequisite_id: null as number | null,
    flags: [{ flag: "", is_case_insensitive: false, allow_variations: false }] as ChallengeFlag[],
    urls: [{ url: "", display_name: "" }] as ChallengeUrl[],
  });

  const { loading: fetchLoading, setLoading: setFetchLoading } = useLoading(true);
  const { loading: actionLoading, setLoading: setActionLoading } = useLoading();
  const { loading: formLoading, setLoading: setFormLoading } = useLoading();
  const { message, showMessage } = useMessage();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchData();
  }, [currentPage]);

  const fetchData = async () => {
    setFetchLoading(true);
    try {
      const [challengesRes, modulesRes] = await Promise.all([
        fetch(`/api/admin/challenges?page=${currentPage}&limit=15`),
        fetch("/api/admin/modules"),
      ]);
      const challengesData = await challengesRes.json();
      const modulesData = await modulesRes.json();
      setChallenges(challengesData.challenges || []);
      setTotal(challengesData.total || 0);
      setTotalPages(challengesData.totalPages || 1);
      setModules(modulesData.modules || []);
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setFetchLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      module_id: 0,
      title: "",
      description: "",
      max_points: 100,
      min_points: 10,
      decay_limit: 1000,
      difficulty_level: "medium",
      prerequisite_id: null,
      flags: [{ flag: "", is_case_insensitive: false, allow_variations: false }],
      urls: [{ url: "", display_name: "" }],
    });
    setEditingChallenge(null);
    setShowForm(false);
  };

  const handleEdit = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setFormData({
      module_id: challenge.module_id,
      title: challenge.title,
      description: challenge.description,
      max_points: challenge.max_points,
      min_points: challenge.min_points,
      decay_limit: challenge.decay_limit,
      difficulty_level: challenge.difficulty_level,
      prerequisite_id: challenge.prerequisite_id,
      flags: challenge.flags || [{ flag: "", is_case_insensitive: false, allow_variations: false }],
      urls: challenge.urls || [{ url: "", display_name: "" }],
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || formData.module_id === 0) {
      showMessage("error", "Title and module are required");
      return;
    }

    if (formData.flags.every((f) => !f.flag.trim())) {
      showMessage("error", "At least one flag is required");
      return;
    }

    setFormLoading(true);
    try {
      const url = editingChallenge ? `/api/admin/challenges/${editingChallenge.id}` : "/api/admin/challenges";
      const method = editingChallenge ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          flags: formData.flags.filter((f) => f.flag.trim()),
          urls: formData.urls.filter((u) => u.url.trim()),
        }),
      });

      if (!res.ok) throw new Error("Failed to save challenge");
      showMessage("success", editingChallenge ? "Challenge updated" : "Challenge created");
      resetForm();
      fetchData();
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (challenge: Challenge) => {
    if (!confirm(`Delete "${challenge.title}"?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/challenges/${challenge.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      showMessage("success", "Challenge deleted");
      fetchData();
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Challenges"
        icon={<span>⚡</span>}
        count={challenges.length}
        actionButton={{
          label: "Create Challenge",
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
          <p className="text-gray-400">Loading challenges...</p>
        </div>
      ) : challenges.length === 0 ? (
        <div className="card text-center py-12">
          <AlertCircle size={32} className="mx-auto mb-4 text-gray-500" />
          <p className="text-gray-400 mb-4">No challenges yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <Plus size={18} /> Create First Challenge
          </button>
        </div>
      ) : (
        <div className="grid gap-2">
          {challenges.map((challenge) => (
            <div key={challenge.id} className="card">
              <div
                className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-800/50 rounded transition-colors"
                onClick={() => setExpandedId(expandedId === challenge.id ? null : challenge.id)}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white">{challenge.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Module: {modules.find((m) => m.id === challenge.module_id)?.title || "Unknown"} •
                    {challenge.difficulty_level} • {challenge.max_points} pts
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(challenge);
                    }}
                    className="btn btn-sm btn-secondary"
                    disabled={actionLoading}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(challenge);
                    }}
                    className="btn btn-sm btn-error"
                    disabled={actionLoading}
                  >
                    <Trash2 size={16} />
                  </button>
                  <button onClick={() => {}} className="btn btn-sm btn-secondary">
                    {expandedId === challenge.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {expandedId === challenge.id && (
                <div className="mt-4 pt-4 border-t border-gray-700 space-y-3 text-sm">
                  <p className="text-gray-400">{challenge.description}</p>
                  {challenge.flags && challenge.flags.length > 0 && (
                    <div>
                      <p className="text-gray-300 font-semibold mb-2">Flags:</p>
                      <div className="space-y-1">
                        {challenge.flags.map((flag, i) => (
                          <code key={i} className="text-green-400 text-xs block">
                            {flag.flag}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                  {challenge.urls && challenge.urls.length > 0 && (
                    <div>
                      <p className="text-gray-300 font-semibold mb-2">URLs:</p>
                      <div className="space-y-1">
                        {challenge.urls.map((url, i) => (
                          <a
                            key={i}
                            href={url.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 text-xs block hover:underline"
                          >
                            {url.display_name || url.url}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-gray-500">Created: {formatDate(challenge.created_at)}</p>
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
            <h2 className="text-xl font-bold mb-4">{editingChallenge ? "Edit Challenge" : "Create Challenge"}</h2>

            <form onSubmit={handleSubmit} className="space-y-4 max-h-[500px] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Module *</label>
                  <select
                    value={formData.module_id}
                    onChange={(e) => setFormData({ ...formData, module_id: parseInt(e.target.value) })}
                    className="input w-full"
                    disabled={formLoading}
                  >
                    <option value={0}>Select Module</option>
                    {modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Difficulty</label>
                  <select
                    value={formData.difficulty_level}
                    onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                    className="input w-full"
                    disabled={formLoading}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Challenge name"
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
                  placeholder="Challenge description"
                  className="input w-full resize-none"
                  rows={3}
                  disabled={formLoading}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Max Points</label>
                  <input
                    type="number"
                    value={formData.max_points}
                    onChange={(e) => setFormData({ ...formData, max_points: parseInt(e.target.value) || 0 })}
                    className="input w-full"
                    disabled={formLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Min Points</label>
                  <input
                    type="number"
                    value={formData.min_points}
                    onChange={(e) => setFormData({ ...formData, min_points: parseInt(e.target.value) || 0 })}
                    className="input w-full"
                    disabled={formLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Decay Limit</label>
                  <input
                    type="number"
                    value={formData.decay_limit}
                    onChange={(e) => setFormData({ ...formData, decay_limit: parseInt(e.target.value) || 0 })}
                    className="input w-full"
                    disabled={formLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Flags *</label>
                {formData.flags.map((flag, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={flag.flag}
                      onChange={(e) => {
                        const newFlags = [...formData.flags];
                        newFlags[idx].flag = e.target.value;
                        setFormData({ ...formData, flags: newFlags });
                      }}
                      placeholder="Flag value"
                      className="input w-full"
                      disabled={formLoading}
                    />
                    {formData.flags.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, flags: formData.flags.filter((_, i) => i !== idx) })}
                        className="btn btn-sm btn-error"
                        disabled={formLoading}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, flags: [...formData.flags, { flag: "", is_case_insensitive: false, allow_variations: false }] })}
                  className="btn btn-sm btn-secondary"
                  disabled={formLoading}
                >
                  Add Flag
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
                    "Save Challenge"
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
