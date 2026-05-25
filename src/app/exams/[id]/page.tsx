"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  ChevronLeft, CheckCircle2, AlertCircle, Loader2, Send, 
  Award, BookOpen, Check, RefreshCw, XCircle, CheckCheck
} from "lucide-react";
import Link from "next/link";

interface Question {
  id: number;
  question_type: 'mcq' | 'checkbox' | 'fitb' | 'challenge';
  question_text: string;
  points: number;
  challenge_id: number | null;
  options?: { id: number; option_text: string }[];
}

interface ExamDetail {
  id: number;
  lesson_id: number;
  title: string;
  description: string;
  questions: Question[];
}

export default function ExamTakerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id;
  
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [solvedChallengeIds, setSolvedChallengeIds] = useState<number[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session && id) {
      fetch(`/api/exams?examId=${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          setExam(data.exam);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
      
      // Fetch user stats to get solved challenges
      fetch("/api/user/stats")
        .then(res => res.json())
        .then(data => {
          setSolvedChallengeIds(data.solves.map((s: any) => s.challenge_id));
        })
        .catch(() => {
          // Silently fail if we can't fetch stats
        });
    }
  }, [session, id]);

  const handleAnswerChange = (questionId: number, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleCheckboxChange = (questionId: number, optionId: number) => {
    const current = answers[questionId] || [];
    const updated = current.includes(optionId) 
      ? current.filter((id: number) => id !== optionId)
      : [...current, optionId];
    setAnswers(prev => ({ ...prev, [questionId]: updated }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: id,
          answers
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit exam");
      
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || loading) {
    return <div className="p-8 text-center text-primary font-mono animate-pulse">Loading Exam...</div>;
  }

  if (error && !result) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="card border-error/20 bg-error/5 py-12">
          <AlertCircle size={48} className="mx-auto mb-4 text-error" />
          <h2 className="text-2xl font-bold mb-2">Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button 
            className="btn btn-primary"
            onClick={() => router.push("/resources")}
          >
            Back to Resources
          </button>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="card border-primary/20 bg-primary/5 py-12">
          {result.isPerfect ? (
            <Award size={64} className="mx-auto mb-6 text-yellow-500 animate-bounce" />
          ) : (
            <XCircle size={64} className="mx-auto mb-6 text-error" />
          )}
          
          <h2 className="text-3xl font-bold mb-2 text-white">
            {result.isPerfect ? "Lesson Completed!" : "Try Again!"}
          </h2>
          <p className="text-lg text-gray-400 mb-8">
            {result.message}
          </p>

          <div className="grid gap-4 mb-10 max-w-md mx-auto">
            {result.results.map((r: any, idx: number) => (
              <div key={idx} className={`flex items-center justify-between p-3 rounded border ${r.isCorrect ? 'bg-green-500/5 border-green-500/20' : 'bg-error/5 border-error/20'}`}>
                <span className="text-sm text-gray-400 font-mono">Question {idx + 1}</span>
                {r.isCorrect ? (
                  <span className="text-green-500 flex items-center gap-1 text-sm font-bold uppercase tracking-wider">
                    <Check size={16} /> Correct
                  </span>
                ) : (
                  <span className="text-error flex items-center gap-1 text-sm font-bold uppercase tracking-wider">
                    <XCircle size={16} /> Incorrect
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!result.isPerfect && (
              <button 
                className="btn btn-secondary px-10 flex items-center gap-2"
                onClick={() => setResult(null)}
              >
                <RefreshCw size={18} /> Retry Problems
              </button>
            )}
            <button 
              className="btn btn-primary px-10"
              onClick={() => router.push("/resources")}
            >
              Back to Resources
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!exam) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-10">
        <Link 
          href="/resources"
          className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors font-mono text-sm mb-4"
        >
          <ChevronLeft size={16} /> EXIT EXAM
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">{exam.title}</h1>
        <p className="text-gray-400">{exam.description}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 pb-20">
        {exam.questions.map((q, index) => (
          <div key={q.id} className="card bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-all">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold font-mono">
                  {index + 1}
                </span>
                <h3 className="text-lg font-semibold text-white leading-relaxed">{q.question_text}</h3>
              </div>
              <span className="text-[10px] font-mono font-bold tracking-tighter text-gray-500 py-1 px-2 bg-gray-800 rounded uppercase">
                {q.points} PTS
              </span>
            </div>

            {(q.question_type === 'mcq' || q.question_type === 'checkbox') && (
              <div className="grid grid-cols-1 gap-3 ml-0 sm:ml-11">
                {q.options?.map(opt => {
                  const isSelected = q.question_type === 'mcq' 
                    ? String(answers[q.id]) === String(opt.id)
                    : (answers[q.id] || []).includes(opt.id);

                  return (
                    <div 
                      key={opt.id}
                      onClick={() => q.question_type === 'mcq' ? handleAnswerChange(q.id, String(opt.id)) : handleCheckboxChange(q.id, opt.id)}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group ${
                        isSelected 
                          ? 'bg-primary/10 border-primary text-white shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]' 
                          : 'bg-black/40 border-gray-800 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-5 h-5 rounded flex items-center justify-center border ${
                          isSelected ? 'bg-primary border-primary' : 'bg-transparent border-gray-600'
                        }`}>
                          {isSelected && <Check size={14} className="text-black font-bold" />}
                        </div>
                        <span className="font-medium group-hover:text-white transition-colors">
                          {opt.option_text}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="text-[10px] font-bold text-primary uppercase tracking-widest hidden sm:block">Selected</div>
                      )}
                    </div>
                  );
                })}
                {q.question_type === 'checkbox' && (
                  <p className="text-[10px] text-gray-500 italic mt-2 uppercase tracking-widest">
                    * Multiple answers may be correct. Select all that apply.
                  </p>
                )}
              </div>
            )}

            {q.question_type === 'fitb' && (
              <div className="mt-4 ml-0 sm:ml-11">
                <input 
                  type="text" 
                  placeholder="Type your answer here..."
                  value={answers[q.id] || ""}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  className="input w-full bg-black/40 border-2 border-gray-800 focus:border-primary transition-all text-white py-4"
                />
              </div>
            )}

            {q.question_type === 'challenge' && (
              <div className={`mt-4 ml-0 sm:ml-11 p-6 border-2 rounded-2xl relative overflow-hidden group ${
                solvedChallengeIds.includes(q.challenge_id!) 
                  ? 'bg-accent/5 border-accent/20' 
                  : 'bg-primary/5 border-primary/10'
              }`}>
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  {solvedChallengeIds.includes(q.challenge_id!) ? (
                    <CheckCheck size={120} />
                  ) : (
                    <CheckCircle2 size={120} />
                  )}
                </div>
                <div className="relative z-10">
                  <div className={`flex items-center gap-2 mb-3 ${
                    solvedChallengeIds.includes(q.challenge_id!) 
                      ? 'text-accent' 
                      : 'text-primary'
                  }`}>
                    {solvedChallengeIds.includes(q.challenge_id!) ? (
                      <CheckCheck size={20} />
                    ) : (
                      <CheckCircle2 size={20} />
                    )}
                    <span className="font-bold text-sm tracking-wider uppercase">
                      {solvedChallengeIds.includes(q.challenge_id!) ? 'Challenge Solved ✓' : 'Challenge Verification'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-6 max-w-lg leading-relaxed">
                    {solvedChallengeIds.includes(q.challenge_id!) 
                      ? 'This challenge has been solved! You can review it or move on to the next question.'
                      : 'This question is linked to a CTF challenge. Solve the challenge on the platform, and then submit this exam. We\'ll automatically verify your progress.'
                    }
                  </p>
                  <Link 
                    href={`/challenges?id=${q.challenge_id}`}
                    target="_blank"
                    className={`btn btn-sm inline-flex items-center gap-2 px-6 ${
                      solvedChallengeIds.includes(q.challenge_id!) 
                        ? 'btn-secondary' 
                        : 'btn-primary'
                    }`}
                  >
                    <BookOpen size={14} /> {solvedChallengeIds.includes(q.challenge_id!) ? 'Review Challenge' : 'Go to Challenge'}
                  </Link>
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-xl border-t border-border-color z-50">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="hidden sm:block">
              <span className="text-xs text-gray-500 uppercase tracking-widest">Progress</span>
              <p className="text-sm text-white font-mono">
                {exam.questions.reduce((count, q) => {
                  if (q.question_type === 'challenge') {
                    return count + (solvedChallengeIds.includes(q.challenge_id!) ? 1 : 0);
                  }
                  return count + (answers[q.id] !== undefined && answers[q.id] !== '' && answers[q.id].length > 0 ? 1 : 0);
                }, 0)} of {exam.questions.length} Questions Answered
              </p>
            </div>
            <button 
              type="submit" 
              className="btn btn-primary px-12 py-3 h-auto text-lg flex items-center gap-2 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 className="animate-spin" size={20} /> Submitting...</>
              ) : (
                <><Send size={20} /> Complete Lesson</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
