"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, ChevronRight, Play, FileText, Lock, CheckCircle2, Check } from "lucide-react";
import Link from "next/link";

interface Lesson {
  lesson_id: number;
  title: string;
  order_index: number;
  has_exam: number;
  is_completed: boolean;
}

interface ModuleDetail {
  id: number;
  title: string;
  description: string;
  is_premium: boolean;
  lessons: Lesson[];
}

export default function ModuleDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id;
  
  const [module, setModule] = useState<ModuleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session && id) {
      // Check subscription
      fetch("/api/user/stats")
        .then((res) => res.json())
        .then((data) => {
          setIsSubscribed(data.isPremium === true);
        });

      // Fetch module details
      fetch(`/api/modules/${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            router.push("/resources");
          } else {
            setModule(data);
          }
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
          router.push("/resources");
        });
    }
  }, [session, id, router]);

  if (status === "loading" || loading) {
    return <div className="p-8 text-center text-primary font-mono animate-pulse">Loading Module...</div>;
  }

  if (!module) return null;

  const isLocked = !!module.is_premium && !isSubscribed;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-gray-500 text-sm mb-8 font-mono">
        <Link href="/resources" className="hover:text-primary transition-colors">RESOURCES</Link>
        <ChevronRight size={14} />
        <span className="text-gray-300 truncate">{module.title.toUpperCase()}</span>
      </div>

      {/* Module Header */}
      <div className="card mb-12 border-primary/20 bg-primary/5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">{module.title}</h1>
          {!!module.is_premium && (
            <span className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-bold ${isLocked ? 'bg-gray-800 text-gray-500 border border-white/5' : 'bg-primary/10 text-primary border border-primary/30'}`}>
              {isLocked ? <Lock size={10} /> : <CheckCircle2 size={10} className="text-green-500" />} PREMIUM
            </span>
          )}
        </div>
        <p className="text-gray-400 text-lg leading-relaxed">{module.description}</p>
      </div>

      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <BookOpen className="text-primary" size={20} />
        Course Curriculum
      </h2>

      {isLocked ? (
        <div className="card text-center py-12 bg-black/40 border-dashed">
          <Lock size={48} className="mx-auto mb-4 text-gray-600" />
          <h3 className="text-xl font-bold mb-2">This module is premium</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            You need an active subscription to access these materials. Upgrade your account to unlock all premium content.
          </p>
          <button 
            className="btn btn-primary px-8"
            onClick={() => router.push("/profile")}
          >
            Upgrade Now
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {module.lessons && module.lessons.length > 0 ? (
            module.lessons.map((lesson, index) => (
              <div 
                key={lesson.lesson_id} 
                className="card hover:border-primary/50 transition-all cursor-pointer group"
                onClick={() => router.push(`/lessons/${lesson.lesson_id}`)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded border flex items-center justify-center font-bold font-mono transition-colors ${
                      lesson.is_completed 
                        ? 'bg-green-500/20 border-green-500/50 text-green-500' 
                        : 'bg-gray-900 border-border-color text-primary group-hover:bg-primary group-hover:text-black'
                    }`}>
                      {lesson.is_completed ? <Check size={18} /> : index + 1}
                    </div>
                    <div>
                      <h3 className={`text-lg font-semibold transition-colors ${
                        lesson.is_completed ? 'text-gray-400' : 'text-white group-hover:text-primary'
                      }`}>
                        {lesson.title}
                        {lesson.is_completed && <span className="ml-2 text-xs font-mono text-green-500 uppercase tracking-wider">[LEARNED]</span>}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Play size={12} /> Lesson
                        </span>
                        {lesson.has_exam > 0 && (
                          <span className="flex items-center gap-1 text-yellow-500/70">
                            <FileText size={12} /> Practice Problems
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-600 group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))
          ) : (
            <div className="card text-center py-12 text-gray-500 border-dashed">
              <p>No lessons added to this module yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
