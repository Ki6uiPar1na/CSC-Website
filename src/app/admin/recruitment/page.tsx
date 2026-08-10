"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Plus, Trash2, Loader2, AlertCircle, Save, ChevronUp, ChevronDown,
  FileDown, Settings2, Inbox, Eye, X,
} from "lucide-react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { useToast } from "@/components/ToastProvider";
import { useLoading } from "@/lib/admin-hooks";
import { formatDateTime } from "@/lib/admin-utils";

interface Field {
  _id: number;
  key: string;
  label: string;
  type: "text" | "email" | "phone" | "number" | "textarea" | "select" | "radio" | "checkbox" | "date";
  required: boolean;
  options: string[];
  placeholder: string;
  width: "full" | "half";
}

interface Submission {
  id: number;
  data: Record<string, any>;
  created_at: string;
}

const FIELD_TYPES: { value: Field["type"]; label: string }[] = [
  { value: "text", label: "Short Text" },
  { value: "textarea", label: "Long Text" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Radio Buttons" },
  { value: "checkbox", label: "Checkboxes" },
];

let fieldSeq = 0;
const newField = (): Field => ({
  _id: ++fieldSeq,
  key: "",
  label: "",
  type: "text",
  required: false,
  options: [],
  placeholder: "",
  width: "full",
});

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30";

const labelClass = "mb-1.5 block text-xs font-medium text-slate-400";

const toDatetimeLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function AdminRecruitmentPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast, confirm } = useToast();
  const { loading: fetchLoading, setLoading: setFetchLoading } = useLoading(true);
  const { loading: saveLoading, setLoading: setSaveLoading } = useLoading();
  const { loading: deleteLoading, setLoading: setDeleteLoading } = useLoading();

  const userRole = session?.user ? (session.user as any).role : null;

  const [tab, setTab] = useState<"settings" | "submissions">("settings");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [deadline, setDeadline] = useState("");
  const [fields, setFields] = useState<Field[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [preview, setPreview] = useState<Submission | null>(null);

  useEffect(() => {
    fetchAll();
  }, [currentPage]);

  const fetchAll = async () => {
    setFetchLoading(true);
    try {
      const res = await fetch(`/api/admin/recruitment?page=${currentPage}&limit=15`);
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "Admin access required") {
          router.push(userRole === 2 ? "/admin" : "/");
          return;
        }
        throw new Error(data.error || "Failed to fetch recruitment data");
      }
      if (data.settings) {
        setTitle(data.settings.title || "");
        setDescription(data.settings.description || "");
        setIsOpen(!!data.settings.is_open);
        setDeadline(toDatetimeLocal(data.settings.deadline));
        setFields(
          (data.settings.fields || []).map((f: any) => ({
            _id: ++fieldSeq,
            key: f.key,
            label: f.label,
            type: f.type,
            required: !!f.required,
            options: Array.isArray(f.options) ? f.options : [],
            placeholder: f.placeholder || "",
            width: f.width === "half" ? "half" : "full",
          }))
        );
      }
      setSubmissions(data.submissions || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (error: any) {
      toast.error(error.message || "Failed to load recruitment data");
    } finally {
      setFetchLoading(false);
    }
  };

  const updateField = (_id: number, patch: Partial<Field>) => {
    setFields((prev) => prev.map((f) => (f._id === _id ? { ...f, ...patch } : f)));
  };

  const moveField = (_id: number, direction: -1 | 1) => {
    setFields((prev) => {
      const index = prev.findIndex((f) => f._id === _id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const saveSettings = async () => {
    setFormError(null);
    if (!title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (fields.length === 0) {
      setFormError("Add at least one form field.");
      return;
    }
    for (const field of fields) {
      if (!field.label.trim()) {
        setFormError("Every field needs a label.");
        return;
      }
      if ((field.type === "select" || field.type === "radio" || field.type === "checkbox") && field.options.length === 0) {
        setFormError(`Field "${field.label || "Untitled"}" needs at least one option.`);
        return;
      }
    }

    setSaveLoading(true);
    try {
      const payload = {
        title,
        description,
        is_open: isOpen,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        fields: fields.map(({ _id, ...rest }) => rest),
      };
      const res = await fetch("/api/admin/recruitment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to save settings");
        return;
      }
      toast.success(data.message || "Recruitment settings saved");
    } catch (error: any) {
      setFormError(error.message || "Failed to save settings");
    } finally {
      setSaveLoading(false);
    }
  };

  const deleteSubmission = async (submission: Submission) => {
    if (!(await confirm({
      message: `Delete submission #${submission.id}? This cannot be undone.`,
      danger: true,
      confirmLabel: "Delete",
    }))) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/recruitment/submissions/${submission.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete submission");
      toast.success("Submission deleted");
      setPreview(null);
      fetchAll();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete submission");
    } finally {
      setDeleteLoading(false);
    }
  };

  const exportCsv = () => {
    window.location.href = "/api/admin/recruitment/export";
  };

  const previewFields = fields.filter((f) => f.label.trim() !== "");
  const previewColumns = previewFields.slice(0, 3);

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Recruitment"
        actionButton={{
          label: "View Public Page",
          onClick: () => router.push("/recruitment"),
        }}
      />
      <p className="-mt-4 text-sm text-slate-500">
        Customize the New Member Recruitment form and review applications.
      </p>

      <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
        <button
          onClick={() => setTab("settings")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === "settings" ? "bg-primary text-black" : "text-slate-400 hover:text-slate-200"}`}
        >
          <Settings2 size={16} /> Form Settings
        </button>
        <button
          onClick={() => setTab("submissions")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === "submissions" ? "bg-primary text-black" : "text-slate-400 hover:text-slate-200"}`}
        >
          <Inbox size={16} /> Applications ({total})
        </button>
      </div>

      {tab === "settings" && (
        <div className="space-y-6">
          {formError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-700/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              <AlertCircle size={16} /> {formError}
            </div>
          )}

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-base font-semibold text-slate-200">Form Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Form Title</label>
                <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New Member Recruitment" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea className={`${inputClass} min-h-20 resize-y`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description shown on the public page" />
              </div>
              <div>
                <label className={labelClass}>Application Deadline</label>
                <input type="datetime-local" className={inputClass} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
              <div className="flex items-end">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={isOpen}
                    onChange={(e) => setIsOpen(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Form is open for submissions
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-200">Form Fields</h2>
                <p className="text-xs text-slate-500">Fields, labels, types, and order are fully customizable.</p>
              </div>
              <button
                onClick={() => setFields((prev) => [...prev, newField()])}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
              >
                <Plus size={16} /> Add Field
              </button>
            </div>

            {fields.length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
                No fields yet. Click "Add Field" to build your form.
              </p>
            )}

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field._id} className="rounded-lg border border-slate-800 bg-slate-800/40 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-slate-300">{field.label || "Untitled Field"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveField(field._id, -1)}
                        disabled={index === 0}
                        className="rounded p-1 text-slate-500 transition hover:bg-slate-700 hover:text-slate-200 disabled:opacity-30"
                        title="Move up"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        onClick={() => moveField(field._id, 1)}
                        disabled={index === fields.length - 1}
                        className="rounded p-1 text-slate-500 transition hover:bg-slate-700 hover:text-slate-200 disabled:opacity-30"
                        title="Move down"
                      >
                        <ChevronDown size={16} />
                      </button>
                      <button
                        onClick={() => setFields((prev) => prev.filter((f) => f._id !== field._id))}
                        className="rounded p-1 text-red-500 transition hover:bg-red-950/50"
                        title="Delete field"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Label</label>
                      <input
                        className={inputClass}
                        value={field.label}
                        onChange={(e) => {
                          const label = e.target.value;
                          updateField(field._id, { label, key: field.key || label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") });
                        }}
                        placeholder="Full Name"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Field Key</label>
                      <input
                        className={inputClass}
                        value={field.key}
                        onChange={(e) => updateField(field._id, { key: e.target.value })}
                        placeholder="full_name"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Type</label>
                      <select
                        className={inputClass}
                        value={field.type}
                        onChange={(e) => updateField(field._id, { type: e.target.value as Field["type"] })}
                      >
                        {FIELD_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Width</label>
                      <select
                        className={inputClass}
                        value={field.width}
                        onChange={(e) => updateField(field._id, { width: e.target.value as "full" | "half" })}
                      >
                        <option value="full">Full width</option>
                        <option value="half">Half width</option>
                      </select>
                    </div>
                    {field.type !== "select" && field.type !== "radio" && field.type !== "checkbox" && (
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Placeholder</label>
                        <input
                          className={inputClass}
                          value={field.placeholder}
                          onChange={(e) => updateField(field._id, { placeholder: e.target.value })}
                          placeholder="Optional placeholder text"
                        />
                      </div>
                    )}
                    {(field.type === "select" || field.type === "radio" || field.type === "checkbox") && (
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Options (one per line)</label>
                        <textarea
                          className={`${inputClass} min-h-20 resize-y`}
                          value={field.options.join("\n")}
                          onChange={(e) => updateField(field._id, { options: e.target.value.split("\n") })}
                          placeholder="Option 1&#10;Option 2&#10;Option 3"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(field._id, { required: e.target.checked })}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-sm text-slate-300">Required field</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={saveSettings}
                disabled={saveLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
              >
                {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                {saveLoading ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "submissions" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm text-slate-300">
              <span className="font-semibold text-slate-100">{total}</span> application{total === 1 ? "" : "s"} received
            </p>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
            >
              <FileDown size={16} /> Export CSV
            </button>
          </div>

          {submissions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
              <Inbox className="mx-auto mb-3 h-10 w-10 text-slate-600" />
              <p className="text-sm text-slate-400">No applications yet.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Submitted</th>
                    {previewColumns.map((f) => (
                      <th key={f._id} className="px-4 py-3">{f.label}</th>
                    ))}
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="transition hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-400">#{submission.id}</td>
                      <td className="px-4 py-3 text-slate-300">{formatDateTime(submission.created_at)}</td>
                      {previewColumns.map((f) => (
                        <td key={f._id} className="max-w-48 truncate px-4 py-3 text-slate-300">
                          {Array.isArray(submission.data[f.key])
                            ? submission.data[f.key].join(", ")
                            : submission.data[f.key] ?? "—"}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setPreview(submission)}
                            className="rounded p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-slate-200"
                            title="View full application"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => deleteSubmission(submission)}
                            disabled={deleteLoading}
                            className="rounded p-1.5 text-red-500 transition hover:bg-red-950/50 disabled:opacity-40"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-primary hover:text-primary disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-primary hover:text-primary disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setPreview(null)}>
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-100">
                Application #{preview.id}
                <span className="ml-2 text-xs font-normal text-slate-500">{formatDateTime(preview.created_at)}</span>
              </h3>
              <button onClick={() => setPreview(null)} className="rounded p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              {previewFields.map((f) => (
                <div key={f._id}>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">{f.label}</p>
                  <p className="text-sm text-slate-200 break-words">
                    {Array.isArray(preview.data[f.key])
                      ? preview.data[f.key].join(", ")
                      : preview.data[f.key] !== "" && preview.data[f.key] != null
                        ? String(preview.data[f.key])
                        : <span className="text-slate-600">—</span>}
                  </p>
                </div>
              ))}
              {previewFields.length === 0 && (
                <p className="text-sm text-slate-500">No data in this application.</p>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => deleteSubmission(preview)}
                disabled={deleteLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-red-700 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-950/50 disabled:opacity-40"
              >
                {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={15} />}
                Delete Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
