"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Trophy, ExternalLink, Users } from "lucide-react";

interface Contest {
  id: number;
  name: string;
  description: string;
  event_date: string;
  winners: string | Record<string, string>;
  photo_url: string;
  details: string;
  team_name?: string | null;
}

export default function ContestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchContest = async () => {
      try {
        const res = await fetch(`/api/contests/${id}`);
        if (!res.ok) throw new Error("Contest not found");
        const data = await res.json();
        setContest(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchContest();
  }, [id]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const parseWinners = (raw: string | Record<string, string>) => {
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) return parsed.map((v) => ({ label: null, name: String(v) }));
      if (parsed && typeof parsed === "object") {
        const map: Record<string, string> = { first: "🥇 1st Place", second: "🥈 2nd Place", third: "🥉 3rd Place" };
        return Object.entries(parsed).map(([k, v]) => ({ label: map[k] ?? k, name: String(v) }));
      }
    } catch {/* ignore */}
    return [];
  };

  const parseDetailsLink = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.link) return parsed.link;
    } catch {/* ignore */}
    return raw;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-slate-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !contest) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-slate-900 to-black flex flex-col items-center justify-center gap-4">
        <Trophy size={48} className="text-gray-700" />
        <h2 className="text-2xl font-bold text-gray-300">Contest not found</h2>
        <Link href="/contests" className="text-primary hover:underline flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Contests
        </Link>
      </div>
    );
  }

  const winners = parseWinners(contest.winners);
  const detailsLink = contest.details ? parseDetailsLink(contest.details) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-900 to-black py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Back Button */}
        <button
          onClick={() => router.push("/contests")}
          className="flex items-center gap-2 text-gray-400 hover:text-primary transition-colors mb-8 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Back to Contests
        </button>

        {/* Card */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl shadow-black/40">

          {/* Hero Image */}
          {contest.photo_url && (
            <div className="w-full h-72 overflow-hidden">
              <img
                src={contest.photo_url}
                alt={contest.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-8 sm:p-12">
            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
              {contest.name}
            </h1>

            {/* Date */}
            <div className="flex items-center gap-2 text-primary mb-2">
              <Calendar size={18} />
              <span className="font-mono text-sm">{formatDate(contest.event_date)}</span>
            </div>

            {contest.team_name && (
              <div className="flex items-center gap-2 text-primary/70 mb-8">
                <Users size={16} />
                <span className="font-mono text-xs">Team: {contest.team_name}</span>
              </div>
            )}

            {/* Description */}
            {contest.description && (
              <p className="text-gray-300 text-lg leading-relaxed mb-10">
                {contest.description}
              </p>
            )}

            {/* Winners */}
            {winners.length > 0 && (
              <div className="bg-slate-800/50 border border-primary/20 rounded-xl p-6 mb-8">
                <h2 className="text-xl font-bold text-accent mb-5 flex items-center gap-2">
                  <Trophy size={20} /> Winners
                </h2>
                <ul className="space-y-4">
                  {winners.map((w, idx) => (
                    <li key={idx} className="flex items-center gap-4">
                      <span className="text-2xl w-8 text-center">
                        {!w.label && (idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "•")}
                      </span>
                      <div>
                        {w.label && (
                          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-0.5">
                            {w.label}
                          </p>
                        )}
                        <p className="text-white font-semibold text-lg">{w.name}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Results Link */}
            {detailsLink && detailsLink.startsWith("http") && (
              <a
                href={detailsLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary/10 hover:bg-primary/20 border border-primary/40 text-primary rounded-lg font-semibold transition-all"
              >
                <ExternalLink size={16} /> View Results
              </a>
            )}
            {detailsLink && !detailsLink.startsWith("http") && (
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">{detailsLink}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
