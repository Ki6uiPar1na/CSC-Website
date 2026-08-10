"use client";

import { useEffect, useState } from "react";
import { Loader2, Send, CheckCircle2, AlertCircle, ClipboardList } from "lucide-react";

interface Field {
  key: string;
  label: string;
  type: "text" | "email" | "phone" | "number" | "textarea" | "select" | "radio" | "checkbox" | "date";
  required?: boolean;
  options?: string[];
  placeholder?: string;
  width?: "full" | "half";
}

interface FormConfig {
  title: string;
  description: string;
  is_open: boolean;
  deadline: string | null;
  fields: Field[];
}

const inputClass =
  "w-full rounded-lg border border-slate-600 bg-slate-900/70 px-4 py-3 text-slate-100 placeholder-slate-500 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30";

export default function RecruitmentPage() {
  const [hydrated, setHydrated] = useState(false);
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/recruitment");
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
          const initial: Record<string, any> = {};
          (data.fields as Field[]).forEach((field) => {
            initial[field.key] = field.type === "checkbox" ? [] : "";
          });
          setFormData(initial);
        }
      } catch (error) {
        console.error("Failed to load recruitment form:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [hydrated]);

  const setValue = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const toggleCheckbox = (key: string, option: string) => {
    setFormData((prev) => {
      const current: string[] = Array.isArray(prev[key]) ? prev[key] : [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [key]: next };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!config) return;

    const newErrors: Record<string, string> = {};
    config.fields.forEach((field) => {
      const value = formData[field.key];
      const isEmpty =
        value === undefined || value === null || value === "" ||
        (Array.isArray(value) && value.length === 0);
      if (field.required && isEmpty) {
        newErrors[field.key] = `${field.label} is required.`;
      }
    });
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    setSuccess(null);
    try {
      const response = await fetch("/api/recruitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.message || "Application submitted successfully!");
        setFormData((prev) => {
          const cleared: Record<string, any> = {};
          config.fields.forEach((field) => {
            cleared[field.key] = field.type === "checkbox" ? [] : "";
          });
          return cleared;
        });
      } else {
        setErrors({ _form: data.error || "Something went wrong. Please try again." });
      }
    } catch (error) {
      console.error("Failed to submit application:", error);
      setErrors({ _form: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: Field) => {
    const value = formData[field.key];
    const error = errors[field.key];

    const fieldError = error ? (
      <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
        <AlertCircle size={14} /> {error}
      </p>
    ) : null;

    let control: React.ReactNode = null;

    switch (field.type) {
      case "textarea":
        control = (
          <textarea
            className={`${inputClass} min-h-28 resize-y`}
            placeholder={field.placeholder}
            value={value ?? ""}
            onChange={(e) => setValue(field.key, e.target.value)}
          />
        );
        break;
      case "select":
        control = (
          <select
            className={inputClass}
            value={value ?? ""}
            onChange={(e) => setValue(field.key, e.target.value)}
          >
            <option value="">Select an option</option>
            {(field.options || []).map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
        break;
      case "radio":
        control = (
          <div className="flex flex-wrap gap-4">
            {(field.options || []).map((option) => (
              <label key={option} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={field.key}
                  checked={value === option}
                  onChange={() => setValue(field.key, option)}
                  className="accent-primary"
                />
                <span className="text-slate-200">{option}</span>
              </label>
            ))}
          </div>
        );
        break;
      case "checkbox":
        control = (
          <div className="flex flex-wrap gap-4">
            {(field.options || []).map((option) => {
              const checked = Array.isArray(value) && value.includes(option);
              return (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCheckbox(field.key, option)}
                    className="accent-primary"
                  />
                  <span className="text-slate-200">{option}</span>
                </label>
              );
            })}
          </div>
        );
        break;
      case "number":
        control = (
          <input
            type="number"
            className={inputClass}
            placeholder={field.placeholder}
            value={value ?? ""}
            onChange={(e) => setValue(field.key, e.target.value)}
          />
        );
        break;
      default:
        control = (
          <input
            type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "date" ? "date" : "text"}
            className={inputClass}
            placeholder={field.placeholder}
            value={value ?? ""}
            onChange={(e) => setValue(field.key, e.target.value)}
          />
        );
    }

    return (
      <div key={field.key} className={field.width === "half" ? "sm:col-span-1" : "sm:col-span-2"}>
        <label className="mb-2 block text-sm font-medium text-slate-300">
          {field.label}
          {field.required && <span className="text-red-400"> *</span>}
        </label>
        {control}
        {fieldError}
      </div>
    );
  };

  if (!hydrated || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-black via-slate-900 to-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-black via-slate-900 to-black text-slate-400">
        Recruitment form is not available right now.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-900 to-black py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
            <ClipboardList className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            {config.title}
          </h1>
          {config.description && (
            <p className="mx-auto mt-4 max-w-2xl text-slate-400">{config.description}</p>
          )}
          {config.deadline && (
            <p className="mt-3 text-sm text-slate-500">
              Deadline: {new Date(config.deadline).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
        </div>

        {!config.is_open ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-10 text-center">
            <p className="text-lg font-medium text-slate-200">Applications are currently closed.</p>
            <p className="mt-2 text-slate-400">Please check back later for future recruitment drives.</p>
          </div>
        ) : success ? (
          <div className="rounded-2xl border border-emerald-700/50 bg-emerald-950/40 p-10 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
            <p className="text-lg font-medium text-emerald-300">{success}</p>
            <button
              onClick={() => setSuccess(null)}
              className="mt-6 rounded-lg border border-slate-600 px-6 py-2.5 text-sm font-medium text-slate-200 transition hover:border-primary hover:text-primary"
            >
              Submit another application
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 sm:p-8"
          >
            {errors._form && (
              <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-700/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                <AlertCircle size={16} /> {errors._form}
              </div>
            )}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {config.fields.map(renderField)}
            </div>
            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={16} />}
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
