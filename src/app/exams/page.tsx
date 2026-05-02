"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, Clock, Award, Loader2, AlertCircle, Play, Eye } from "lucide-react";

interface Exam {
  id: number;
  lesson_id: number;
  title: string;
  description: string;
  pass_marks: number;
  total_marks: number;
  created_at: string;
  question_count?: number;
  user_score?: number;
  user_passed?: boolean;
  user_attempted?: boolean;
}

export default function ExamsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "completed" | "pending">("all");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchExams();
    }
  }, [status, router]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/exams");

      if (!response.ok) {
        throw new Error("Failed to fetch exams");
      }

      const data = await response.json();
      setExams(data.exams || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredExams = exams.filter((exam) => {
    if (filter === "completed") return exam.user_attempted;
    if (filter === "pending") return !exam.user_attempted;
    return true;
  });

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-gray-400">Loading exams...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen size={28} className="text-primary" />
            <h1 className="text-4xl font-bold">Exams</h1>
          </div>
          <p className="text-gray-400">Take exams to test your knowledge and earn points</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded mb-6 flex gap-3">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              filter === "all"
                ? "bg-primary text-black"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            All Exams
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              filter === "pending"
                ? "bg-primary text-black"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Not Attempted
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              filter === "completed"
                ? "bg-primary text-black"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Completed
          </button>
        </div>

        {/* Exams Grid */}
        {filteredExams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam) => (
              <div
                key={exam.id}
                className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10"
              >
                {/* Exam Header */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold mb-2">{exam.title}</h3>
                  {exam.description && (
                    <p className="text-sm text-gray-400 line-clamp-2">{exam.description}</p>
                  )}
                </div>

                {/* Exam Details */}
                <div className="space-y-2 mb-4 pb-4 border-b border-gray-800">
                  {/* Questions Count */}
                  <div className="flex items-center gap-2 text-gray-300">
                    <BookOpen size={16} className="text-primary" />
                    <span className="text-sm">{exam.question_count || "?"} questions</span>
                  </div>

                  {/* Total Marks */}
                  <div className="flex items-center gap-2 text-gray-300">
                    <Award size={16} className="text-primary" />
                    <span className="text-sm">{exam.total_marks} points</span>
                  </div>

                  {/* Pass Marks */}
                  <div className="flex items-center gap-2 text-gray-300">
                    <Clock size={16} className="text-primary" />
                    <span className="text-sm">Pass: {exam.pass_marks} points</span>
                  </div>
                </div>

                {/* Status / Score */}
                {exam.user_attempted && (
                  <div className="mb-4 p-3 rounded bg-gray-800/50 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400 uppercase font-semibold">Your Score</span>
                      <span
                        className={`text-lg font-bold ${
                          exam.user_passed ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {exam.user_score}
                      </span>
                    </div>
                    <div
                      className={`text-xs font-semibold px-2 py-1 rounded w-fit ${
                        exam.user_passed
                          ? "bg-green-900/30 text-green-400"
                          : "bg-red-900/30 text-red-400"
                      }`}
                    >
                      {exam.user_passed ? "✓ Passed" : "✗ Failed"}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {exam.user_attempted ? (
                    <>
                      <button
                        onClick={() => router.push(`/exams/${exam.id}`)}
                        className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded font-semibold transition-colors"
                      >
                        <Play size={16} />
                        Retake
                      </button>
                      <button
                        onClick={() => router.push(`/exams/${exam.id}/results`)}
                        className="flex-1 flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary px-4 py-2 rounded font-semibold transition-colors border border-primary/30"
                      >
                        <Eye size={16} />
                        Results
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => router.push(`/exams/${exam.id}`)}
                      className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-black px-4 py-2 rounded font-semibold transition-colors"
                    >
                      <Play size={16} />
                      Start Exam
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen size={48} className="mx-auto text-gray-700 mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">
              {filter === "all"
                ? "No Exams Available"
                : filter === "pending"
                ? "No Pending Exams"
                : "No Completed Exams"}
            </h3>
            <p className="text-gray-400 max-w-md mx-auto">
              {filter === "all"
                ? "Check back soon for new exams!"
                : filter === "pending"
                ? "You have completed all available exams!"
                : "You haven't attempted any exams yet. Start with a pending exam!"}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
