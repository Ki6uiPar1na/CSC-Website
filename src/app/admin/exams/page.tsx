"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { useMessage, useLoading } from "@/lib/admin-hooks";
import { Event as AdminEvent } from "@/lib/admin-types"; // reuse Event type for basic fields

interface Exam {
  id: number;
  lesson_id: number;
  title: string;
  description?: string;
  pass_marks?: number;
  total_marks?: number;
  created_at?: string;
}

export default function AdminExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", lesson_id: 0, pass_marks: 50, total_marks: 100 });
  const { loading: fetchLoading, setLoading: setFetchLoading } = useLoading(true);
  const { loading: actionLoading, setLoading: setActionLoading } = useLoading();
  const { message, showMessage } = useMessage();

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setFetchLoading(true);
    try {
      const res = await fetch("/api/admin/exams");
      const data = await res.json();
      setExams(data.exams || []);
    } catch (err: any) {
      showMessage("error", err.message || "Failed to fetch exams");
    } finally {
      setFetchLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to create exam");
      showMessage("success", "Exam created");
      setShowForm(false);
      fetchExams();
    } catch (err: any) {
      showMessage("error", err.message || "Failed to create exam");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (exam: Exam) => {
    if (!confirm("Delete this exam?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/exams/${exam.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete exam");
      showMessage("success", "Exam deleted");
      fetchExams();
    } catch (err: any) {
      showMessage("error", err.message || "Failed to delete exam");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Exams"
        icon={<span>📝</span>}
        count={exams.length}
        actionButton={{ label: "Create Exam", onClick: () => setShowForm(true) }}
        message={message}
      />

      {fetchLoading ? (
        <div className="text-center py-12">
          <Loader2 className="animate-spin mx-auto mb-4" size={32} />
          <p className="text-gray-400">Loading exams...</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 mb-4">No exams yet</p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> Create First Exam
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {exams.map((exam) => (
            <div key={exam.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{exam.title}</h3>
                  <p className="text-sm text-gray-400">{exam.description}</p>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-sm btn-secondary" onClick={() => window.location.href = `/admin/exams/${exam.id}`}>
                    <Edit2 size={14} />
                  </button>
                  <button className="btn btn-sm btn-error" onClick={() => handleDelete(exam)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="flex gap-4 text-sm text-gray-400">
                <div>Pass: {exam.pass_marks ?? 50}</div>
                <div>Total: {exam.total_marks ?? 100}</div>
                <div className="ml-auto text-xs text-gray-500">{exam.created_at ? new Date(exam.created_at).toLocaleString() : "-"}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">Create Exam</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Title</label>
                <input className="w-full" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm mb-1">Description</label>
                <textarea className="w-full" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary">Create</button>
                <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
