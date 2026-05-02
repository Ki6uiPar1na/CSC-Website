"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Calendar, CheckCircle, XCircle, Clock, Loader2, AlertCircle } from "lucide-react";

interface ExamSubmission {
  id: number;
  exam_id: number;
  user_id: number;
  exam_title: string;
  score: number;
  max_score: number;
  passed: boolean;
  submitted_at: string;
  time_taken?: number;
  answers_count?: number;
}

export default function ExamResultsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchExamSubmissions();
    }
  }, [status, router]);

  const fetchExamSubmissions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/exams");
      
      if (!response.ok) {
        throw new Error("Failed to fetch exam submissions");
      }

      const data = await response.json();
      setSubmissions(data.submissions || []);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching exam submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-gray-400">Loading your exam history...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const getGradeColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (percentage >= 70) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (percentage >= 50) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  const getScorePercentage = (score: number, maxScore: number) => {
    return Math.round((score / maxScore) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Exam Results</h1>
          <p className="text-gray-400">View your exam submission history and scores</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Results List */}
        {submissions.length > 0 ? (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">{submission.exam_title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar size={16} />
                      {new Date(submission.submitted_at).toLocaleDateString("en-US", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {submission.passed ? (
                      <CheckCircle size={24} className="text-green-400" />
                    ) : (
                      <XCircle size={24} className="text-red-400" />
                    )}
                  </div>
                </div>

                {/* Score Section */}
                <div className={`border rounded-lg p-4 mb-4 ${getGradeColor(submission.score, submission.max_score)}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-80">Your Score</p>
                      <p className="text-2xl font-bold">
                        {submission.score} / {submission.max_score}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold">
                        {getScorePercentage(submission.score, submission.max_score)}%
                      </p>
                      <p className="text-sm opacity-80">
                        {submission.passed ? "✓ Passed" : "✗ Failed"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {submission.time_taken && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock size={16} className="text-primary" />
                      <span>Time: {Math.round(submission.time_taken / 60)} minutes</span>
                    </div>
                  )}
                  {submission.answers_count && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <AlertCircle size={16} className="text-accent" />
                      <span>Answers: {submission.answers_count} submitted</span>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <button
                  onClick={() => router.push(`/exams/${submission.exam_id}`)}
                  className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors"
                >
                  View Exam Details →
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <AlertCircle size={48} className="mx-auto text-gray-700 mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Exam Results Yet</h3>
            <p className="text-gray-400 max-w-md mx-auto mb-6">
              You haven't submitted any exams yet. Start taking exams to build your history.
            </p>
            <button
              onClick={() => router.push("/exams")}
              className="inline-block px-6 py-3 bg-primary text-background rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Browse Exams
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
