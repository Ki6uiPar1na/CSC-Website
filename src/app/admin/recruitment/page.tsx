"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Plus, Trash2, Loader2, AlertCircle, Save, ChevronUp, ChevronDown,
  FileDown, Settings2, Inbox, Eye, X, ArrowLeft, Pencil, ExternalLink, ClipboardList,
} from "lucide-react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { useToast } from "@/components/ToastProvider";
import { useLoading } from "@/lib/admin-hooks";
import { formatDateTime } from "@/lib/admin-utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

interface FormSummary {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  description_align: "left" | "center" | "right";
  is_open: boolean;
  deadline: string | null;
  submission_count: number;
}

interface FormDetail {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  is_open: boolean;
  deadline: string | null;
  fields: { key: string; label: string; type: string; required: boolean; options: string[]; placeholder: string; width: "full" | "half" }[];
}

interface Submission {
  id: number;
  form_id: number | null;
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

const statusOf = (form: FormSummary) => {
  if (!form.is_open) return { label: "Closed", cls: "text-red-400 bg-red-500/10 border-red-500/30" };
  if (form.deadline && new Date(form.deadline).getTime() < Date.now()) {
    return { label: "Deadline passed", cls: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
  }
  return { label: "Open", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
};

export default function AdminRecruitmentPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast, confirm } = useToast();
  const { loading: fetchLoading, setLoading: setFetchLoading } = useLoading(true);
  const { loading: saveLoading, setLoading: setSaveLoading } = useLoading();
  const { loading: deleteLoading, setLoading: setDeleteLoading } = useLoading();
  const { loading: subLoading, setLoading: setSubLoading } = useLoading();

  const userRole = session?.user ? (session.user as any).role : null;

  const [view, setView] = useState<"list" | "edit" | "submissions">("list");
  const [forms, setForms] = useState<FormSummary[]>([]);

  // Editor state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionAlign, setDescriptionAlign] = useState<"left" | "center" | "right">("left");
  const [slug, setSlug] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [deadline, setDeadline] = useState("");
  const [fields, setFields] = useState<Field[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Submissions state
  const [selectedFormId, setSelectedFormId] = useState<number | 0>(0);
  const [selectedFormFields, setSelectedFormFields] = useState<Field[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [preview, setPreview] = useState<Submission | null>(null);
  const [previewFields, setPreviewFields] = useState<Field[]>([]);
  const [previewFormTitle, setPreviewFormTitle] = useState<string | null>(null);

  const fetchForms = async () => {
    setFetchLoading(true);
    try {
      const res = await fetch("/api/admin/recruitment");
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "Admin access required") {
          router.push(userRole === 2 ? "/admin" : "/");
          return;
        }
        throw new Error(data.error || "Failed to fetch application forms");
      }
      setForms(data.forms || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load application forms");
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  useEffect(() => {
    if (view !== "submissions") return;
    fetchSubmissions();
  }, [view, currentPage, selectedFormId]);

  useEffect(() => {
    if (view !== "submissions" || !selectedFormId) {
      setSelectedFormFields([]);
      return;
    }
    fetch(`/api/admin/recruitment/${selectedFormId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setSelectedFormFields(
          (data?.fields || []).map((f: any) => ({
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
      })
      .catch(() => setSelectedFormFields([]));
  }, [view, selectedFormId]);

  const loadPreviewFields = async (formId: number | null) => {
    setPreviewFields([]);
    setPreviewFormTitle(null);
    if (formId == null) return;
    const form = forms.find((f) => f.id === formId);
    setPreviewFormTitle(form?.title ?? null);
    const res = await fetch(`/api/admin/recruitment/${formId}`);
    if (!res.ok) return;
    const data = await res.json();
    setPreviewFields(
      (data.fields || []).map((f: any) => ({
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
  };

  const fetchSubmissions = async () => {
    setSubLoading(true);
    try {
      const query = selectedFormId ? `form_id=${selectedFormId}&` : "";
      const res = await fetch(`/api/admin/recruitment/submissions?${query}page=${currentPage}&limit=15`);
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "Admin access required") {
          router.push(userRole === 2 ? "/admin" : "/");
          return;
        }
        throw new Error(data.error || "Failed to fetch submissions");
      }
      setSubmissions(data.submissions || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (error: any) {
      toast.error(error.message || "Failed to load submissions");
    } finally {
      setSubLoading(false);
    }
  };

  const startCreate = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setDescriptionAlign("left");
    setSlug("");
    setIsOpen(true);
    setDeadline("");
    setFields([newField()]);
    setFormError(null);
    setView("edit");
  };

  const startEdit = async (form: FormSummary) => {
    setFormError(null);
    setView("edit");
    setEditingId(form.id);
    setTitle(form.title);
    setDescription(form.description || "");
    setDescriptionAlign(form.description_align || "left");
    setSlug(form.slug);
    setIsOpen(form.is_open);
    setDeadline(toDatetimeLocal(form.deadline));
    setFields([]);
    try {
      const res = await fetch(`/api/admin/recruitment/${form.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load form");
      setFields(
        (data.fields || []).map((f: any) => ({
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
    } catch (error: any) {
      toast.error(error.message || "Failed to load form");
      setFields([newField()]);
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
        ...(editingId ? { id: editingId } : {}),
        title,
        description,
        description_align: descriptionAlign,
        is_open: isOpen,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        slug,
        fields: fields.map(({ _id, ...rest }) => rest),
      };
      const res = await fetch("/api/admin/recruitment", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to save form");
        return;
      }
      toast.success(data.message || "Application form saved");
      setView("list");
      fetchForms();
    } catch (error: any) {
      setFormError(error.message || "Failed to save form");
    } finally {
      setSaveLoading(false);
    }
  };

  const deleteForm = async (form: FormSummary) => {
    const suffix = form.submission_count > 0
      ? ` It has ${form.submission_count} application${form.submission_count === 1 ? "" : "s"} (they will be kept but no longer linked to this form).`
      : "";
    if (!(await confirm({
      message: `Delete form "${form.title}"?${suffix} This cannot be undone.`,
      danger: true,
      confirmLabel: "Delete",
    }))) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/recruitment/${form.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete form");
      toast.success(data.message || "Application form deleted");
      fetchForms();
      if (selectedFormId === form.id) setSelectedFormId(0);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete form");
    } finally {
      setDeleteLoading(false);
    }
  };

  const deleteSubmission = async (submission: Submission) => {
    if (!(await confirm({
      message: `Delete application #${submission.id}? This cannot be undone.`,
      danger: true,
      confirmLabel: "Delete",
    }))) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/recruitment/submissions/${submission.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete submission");
      toast.success("Application deleted");
      setPreview(null);
      fetchSubmissions();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete submission");
    } finally {
      setDeleteLoading(false);
    }
  };

  const exportCsv = () => {
    const query = selectedFormId ? `?form_id=${selectedFormId}` : "";
    window.location.href = `/api/admin/recruitment/export${query}`;
  };

  const openSubmissions = (formId: number | 0) => {
    setSelectedFormId(formId);
    setCurrentPage(1);
    setView("submissions");
  };

  const selectedForm = selectedFormId
    ? forms.find((f) => f.id === selectedFormId) ?? null
    : null;

  const renderFormFields = (fields: Field[]) => fields.map((field, index) => (
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
  ));

  if (fetchLoading && view === "list") {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {view === "list" && (
        <>
          <AdminPageHeader
            title="Apply Forms"
            actionButton={{
              label: "New Form",
              onClick: startCreate,
              icon: <Plus size={16} />,
            }}
          />
          <p className="-mt-4 text-sm text-slate-500">
            Create and manage application forms. Each form gets its own public page at /apply/&lt;slug&gt;.
          </p>

          <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${view === "list" ? "bg-primary text-black" : "text-slate-400 hover:text-slate-200"}`}
            >
              <ClipboardList size={16} /> Forms
            </button>
            <button
              onClick={() => openSubmissions(0)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition text-slate-400 hover:text-slate-200"
            >
              <Inbox size={16} /> All Applications
            </button>
          </div>

          {forms.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
              <ClipboardList className="mx-auto mb-3 h-10 w-10 text-slate-600" />
              <p className="text-sm text-slate-400">No application forms yet.</p>
              <button
                onClick={startCreate}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
              >
                <Plus size={16} /> Create your first form
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Form</th>
                    <th className="px-4 py-3">URL</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Deadline</th>
                    <th className="px-4 py-3">Applications</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {forms.map((form) => {
                    const status = statusOf(form);
                    return (
                      <tr key={form.id} className="transition hover:bg-slate-800/40">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-200">{form.title}</p>
                          {form.description && (
                            <p className="max-w-64 truncate text-xs text-slate-500">{form.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-slate-800 px-2 py-1 font-mono text-xs text-slate-400">
                            /apply/{form.slug}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.cls}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {form.deadline ? formatDateTime(form.deadline) : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-300">{form.submission_count}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => router.push(`/apply/${form.slug}`)}
                              className="rounded p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-slate-200"
                              title="View public page"
                            >
                              <ExternalLink size={16} />
                            </button>
                            <button
                              onClick={() => startEdit(form)}
                              className="rounded p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-slate-200"
                              title="Edit form"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => openSubmissions(form.id)}
                              className="rounded p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-slate-200"
                              title="View applications"
                            >
                              <Inbox size={16} />
                            </button>
                            <button
                              onClick={() => deleteForm(form)}
                              disabled={deleteLoading}
                              className="rounded p-1.5 text-red-500 transition hover:bg-red-950/50 disabled:opacity-40"
                              title="Delete form"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {view === "edit" && (
        <>
          <div className="flex items-center justify-between">
            <AdminPageHeader
              title={editingId ? "Edit Application Form" : "New Application Form"}
              actionButton={{
                label: "Back to forms",
                onClick: () => { setView("list"); fetchForms(); },
                icon: <ArrowLeft size={16} />,
              }}
            />
          </div>
          <p className="-mt-4 text-sm text-slate-500">
            {editingId ? "Update the form details, fields, and availability." : "Configure the form; a public page will be created at /apply/<slug>."}
          </p>

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
              <div>
                <label className={labelClass}>URL Slug</label>
                <input
                  className={inputClass}
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="auto-generated from title"
                />
                <p className="mt-1 text-xs text-slate-500">Public URL: /apply/{slug || "&lt;title&gt;"}</p>
              </div>
              <div>
                <label className={labelClass}>Application Deadline</label>
                <input type="datetime-local" className={inputClass} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Description (Markdown supported)</label>
                <div className="mb-2 flex items-center gap-1">
                  <span className="text-xs text-slate-500">Align:</span>
                  {(["left", "center", "right"] as const).map((a) => (
                    <button key={a} type="button" onClick={() => setDescriptionAlign(a)}
                      className={`px-2 py-0.5 text-xs rounded capitalize transition ${
                        descriptionAlign === a
                          ? "bg-primary text-background font-semibold"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >{a}</button>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <textarea className={`${inputClass} min-h-28 resize-y font-mono text-sm`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description shown on the public page (supports **bold**, *italic*, links, lists, etc.)" />
                  {description && (
                    <div className={`${inputClass} min-h-28 overflow-auto`}>
                      <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">Preview</p>
                      <div className="prose prose-invert prose-sm max-w-none text-slate-400" style={{ textAlign: descriptionAlign }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-end sm:col-span-2">
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
              {renderFormFields(fields)}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setView("list"); fetchForms(); }}
                className="rounded-lg border border-slate-700 px-6 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-500"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                disabled={saveLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
              >
                {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                {saveLoading ? "Saving..." : editingId ? "Save Changes" : "Create Form"}
              </button>
            </div>
          </div>
        </>
      )}

      {view === "submissions" && (
        <div className="space-y-6">
          <AdminPageHeader
            title={selectedForm ? `Applications — ${selectedForm.title}` : "All Applications"}
            actionButton={{
              label: "Back to forms",
              onClick: () => setView("list"),
              icon: <ArrowLeft size={16} />,
            }}
          />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center gap-3">
              <label className={labelClass}>Form:</label>
              <select
                className={`${inputClass} w-auto`}
                value={selectedFormId}
                onChange={(e) => {
                  setSelectedFormId(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={0}>All forms</option>
                {forms.map((f) => (
                  <option key={f.id} value={f.id}>{f.title}</option>
                ))}
              </select>
              <p className="text-sm text-slate-300">
                <span className="font-semibold text-slate-100">{total}</span> application{total === 1 ? "" : "s"}
              </p>
            </div>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
            >
              <FileDown size={16} /> Export CSV
            </button>
          </div>

          {subLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
              <Inbox className="mx-auto mb-3 h-10 w-10 text-slate-600" />
              <p className="text-sm text-slate-400">No applications yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">ID</th>
                    {!selectedFormId && <th className="px-4 py-3">Form</th>}
                    <th className="px-4 py-3">Submitted</th>
                    {selectedFormFields.slice(0, 3).map((f) => (
                      <th key={f.key} className="px-4 py-3">{f.label}</th>
                    ))}
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="transition hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-400">#{submission.id}</td>
                      {!selectedFormId && (
                        <td className="px-4 py-3 text-slate-300">
                          {forms.find((f) => f.id === submission.form_id)?.title ?? <span className="text-slate-600">—</span>}
                        </td>
                      )}
                      <td className="px-4 py-3 text-slate-300">{formatDateTime(submission.created_at)}</td>
                      {selectedFormFields.slice(0, 3).map((f) => (
                        <td key={f.key} className="max-w-48 truncate px-4 py-3 text-slate-300">
                          {Array.isArray(submission.data[f.key])
                            ? submission.data[f.key].join(", ")
                            : submission.data[f.key] ?? "—"}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setPreview(submission); loadPreviewFields(submission.form_id); }}
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
            {previewFormTitle && (
              <p className="mb-3 text-xs text-slate-500">
                Form: <span className="text-slate-300">{previewFormTitle}</span>
              </p>
            )}
            <div className="space-y-4">
              {previewFields.length > 0 ? (
                previewFields.map((f) => (
                  <div key={f.key}>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">{f.label}</p>
                    <p className="text-sm text-slate-200 break-words">
                      {Array.isArray(preview.data[f.key])
                        ? preview.data[f.key].join(", ")
                        : preview.data[f.key] !== "" && preview.data[f.key] != null
                          ? String(preview.data[f.key])
                          : <span className="text-slate-600">—</span>}
                    </p>
                  </div>
                ))
              ) : (
                <pre className="whitespace-pre-wrap break-words text-sm text-slate-300">
                  {JSON.stringify(preview.data, null, 2)}
                </pre>
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
