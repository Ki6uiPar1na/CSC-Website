"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, ClipboardList, CalendarClock, ArrowRight, Ban } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ApplyForm {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  description_align: "left" | "center" | "right";
  is_open: boolean;
  is_accepting: boolean;
  deadline: string | null;
}

export default function ApplyPage() {
  const [forms, setForms] = useState<ApplyForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const response = await fetch("/api/recruitment");
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to load application forms");
        }
        const data = await response.json();
        setForms(data.forms || []);
      } catch (e: any) {
        setError(e.message || "Failed to load application forms");
      } finally {
        setLoading(false);
      }
    };
    fetchForms();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-black via-slate-900 to-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-900 to-black py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
            <ClipboardList className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">Apply</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            Select an open application form below to get started.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-700/50 bg-red-950/40 p-8 text-center text-red-300">
            {error}
          </div>
        )}

        {!error && forms.length === 0 && (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-12 text-center">
            <p className="text-lg font-medium text-slate-200">No application forms available right now.</p>
            <p className="mt-2 text-slate-400">Please check back later.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {forms.map((form) => {
            const accepting = form.is_accepting;
            return (
              <div
                key={form.id}
                className={`flex flex-col rounded-2xl border bg-slate-900/60 p-6 transition ${
                  accepting
                    ? "border-slate-700 hover:border-primary hover:bg-slate-900/90"
                    : "border-slate-800 opacity-60"
                }`}
              >
                <h2 className="text-xl font-semibold text-slate-100">{form.title}</h2>
                {form.description && (
                  <div className="prose prose-invert prose-sm mt-2 flex-1 max-w-none text-slate-400 line-clamp-2" style={{ textAlign: form.description_align || "left" }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.description}</ReactMarkdown>
                  </div>
                )}
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <CalendarClock size={14} />
                  {form.deadline ? (
                    <span>
                      Deadline: {new Date(form.deadline).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  ) : (
                    <span>Open until further notice</span>
                  )}
                </div>
                <div className="mt-6">
                  {accepting ? (
                    <Link
                      href={`/apply/${form.slug}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-black transition hover:opacity-90"
                    >
                      Apply Now <ArrowRight size={16} />
                    </Link>
                  ) : (
                    <span className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-6 py-3 text-sm font-medium text-slate-400">
                      <Ban size={15} /> Applications Closed
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
