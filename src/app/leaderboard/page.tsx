"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Trophy, Flame, User } from "lucide-react";

interface LeaderboardEntry {
  id: number;
  username: string;
  total_points: number;
  current_streak: number;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const { status } = useSession();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetch(`/api/leaderboard?page=${currentPage}&limit=15`)
        .then((res) => res.json())
        .then((data) => {
          setLeaderboard(data.leaderboard || []);
          setTotalPages(data.totalPages || 1);
          setTotal(data.total || 0);
          setLoading(false);
        });
    }
  }, [status, router, currentPage]);

  if (status === "loading" || loading) return <div className="p-12 text-center text-primary font-mono animate-pulse">Retrieving Rankings...</div>;
  if (status === "unauthenticated") return null;

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="flex items-center gap-3 sm:gap-4 mb-8">
        <Trophy className="text-primary shrink-0" size={24} />
        <h1 className="glitch-text text-2xl sm:text-4xl md:text-5xl uppercase tracking-tight break-words">Leaderboard</h1>
      </div>

      <div className="card p-0 overflow-hidden border-border-color shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-black/50 border-b-2 border-border-color">
                <th className="px-6 py-5 text-[10px] sm:text-xs font-mono text-primary uppercase tracking-widest">Rank</th>
                <th className="px-6 py-5 text-[10px] sm:text-xs font-mono text-primary uppercase tracking-widest">Operative</th>
                <th className="px-6 py-5 text-[10px] sm:text-xs font-mono text-primary uppercase tracking-widest">Persistence</th>
                <th className="px-6 py-5 text-[10px] sm:text-xs font-mono text-primary uppercase tracking-widest">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color/30">
              {leaderboard.map((user, index) => (
                <tr key={user.id} className="hover:bg-primary/5 transition-colors duration-150">
                  <td className="px-6 py-5 font-mono text-sm sm:text-base">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded shrink-0 ${index === 0 ? 'bg-primary text-black font-bold' : (index === 1 ? 'bg-gray-400 text-black' : (index === 2 ? 'bg-orange-600 text-black' : 'text-gray-500'))}`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-5 underline-offset-4 decoration-primary/30">
                    <div className="flex items-center gap-3 font-bold text-sm sm:text-base">
                      <User size={16} className="text-gray-500" />
                      {user.username}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-accent text-sm sm:text-base font-mono">
                      <Flame size={16} />
                      {user.current_streak} <span className="text-[10px] opacity-50 uppercase tracking-tighter">days</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-primary font-bold text-lg tabular-nums tracking-tighter shadow-primary">
                      {user.total_points.toLocaleString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--primary);
          border-radius: 10px;
        }
      `}</style>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
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
