"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Trophy, Users, ArrowLeft, Globe } from "lucide-react";

interface TeamMember {
  id: number;
  username: string;
  email: string;
}

interface TeamContest {
  id: number;
  name: string;
  description: string;
  event_date: string;
  winners: string | Record<string, string>;
  details: string;
  ctftime_event_id: number | null;
}

interface CTFRating {
  [year: string]: {
    country_place?: number;
    place?: number;
  };
}

interface TeamInfo {
  id: number;
  name: string;
  description: string | null;
  ctftime_team_id: number | null;
  ctftime_logo: string | null;
  ctftime_country: string | null;
  ctftime_primary_alias: string | null;
  ctftime_rating: CTFRating | null;
  ctftime_last_fetched: string | null;
  ctftime_members: any[] | null;
  members: TeamMember[];
  contests: TeamContest[];
}

export default function TeamDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "loading" && !session) {
      router.push("/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session) {
      fetch("/api/user/team")
        .then((res) => res.json())
        .then((data) => {
          setTeamInfo(data.team || null);
          setLoading(false);
        })
        .catch(() => {
          setTeamInfo(null);
          setLoading(false);
        });
    }
  }, [session]);

  if (status === "loading" || loading) {
    return (
      <div className="p-8 text-center text-primary font-mono animate-pulse">
        Loading Team...
      </div>
    );
  }

  if (!session) return null;

  if (!teamInfo) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <Users size={48} className="mx-auto mb-4 text-gray-700" />
        <h1 className="text-xl font-bold mb-2">No Team Assigned</h1>
        <p className="text-gray-400 mb-6">You are not a member of any team.</p>
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 text-primary hover:underline"
        >
          <ArrowLeft size={16} /> Back to Profile
        </Link>
      </div>
    );
  }

  const ratingEntries = teamInfo.ctftime_rating
    ? Object.entries(teamInfo.ctftime_rating)
        .filter(([_, v]: any) => v?.country_place)
        .sort(([a], [b]) => Number(b) - Number(a))
        .slice(0, 6)
    : [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href="/profile"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft size={16} /> Back to Profile
      </Link>

      <div className="card border border-primary/20 mb-6">
        <div className="flex items-center gap-4 mb-4">
          {teamInfo.ctftime_logo ? (
            <img
              src={teamInfo.ctftime_logo}
              alt={teamInfo.name}
              className="w-14 h-14 rounded-full object-cover border border-primary/30"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30">
              <Users size={24} className="text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-white">{teamInfo.name}</h1>
            {teamInfo.ctftime_country && (
              <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
                <Globe size={14} className="text-primary" />
                {teamInfo.ctftime_country}
              </p>
            )}
            {teamInfo.ctftime_primary_alias && teamInfo.ctftime_primary_alias !== teamInfo.name && (
              <p className="text-xs text-gray-500 font-mono mt-0.5">
                aka {teamInfo.ctftime_primary_alias}
              </p>
            )}
          </div>
        </div>

        {teamInfo.description && (
          <p className="text-sm text-gray-400 mb-4">{teamInfo.description}</p>
        )}

        {teamInfo.ctftime_team_id && (
          <a
            href={`https://ctftime.org/team/${teamInfo.ctftime_team_id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary/60 hover:text-primary transition-colors"
          >
            <Globe size={12} /> View on CTFtime
          </a>
        )}
      </div>

      {ratingEntries.length > 0 && (
        <div className="card border border-primary/20 mb-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <Trophy size={16} className="text-primary" /> Country Rank by Year
          </h3>
          <div className="flex flex-wrap gap-2">
            {ratingEntries.map(([year, data]: any) => (
              <span
                key={year}
                className="px-3 py-1 bg-gray-800 rounded-lg text-xs font-mono text-gray-300 border border-gray-700"
              >
                {year}: #{data.country_place}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card border border-primary/20 mb-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
          <Users size={16} className="text-primary" /> Members ({teamInfo.members.length})
        </h3>
        <div className="space-y-2">
          {teamInfo.members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-gray-800/30"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                {m.username[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {m.username}
                </p>
                <p className="text-xs text-gray-500 truncate">{m.email}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {teamInfo.ctftime_members && teamInfo.ctftime_members.length > 0 && (
        <div className="card border border-primary/20 mb-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
            <Users size={16} className="text-primary" /> CTFtime Members ({teamInfo.ctftime_members.length})
          </h3>
          <div className="space-y-2">
            {teamInfo.ctftime_members.map((m: any) => (
              <div
                key={m.id}
                className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-gray-800/30"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                  {(m.name || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <a
                    href={`https://ctftime.org/user/${m.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-white hover:text-primary transition-colors truncate"
                  >
                    {m.name}
                  </a>
                  {m.country && (
                    <p className="text-xs text-gray-500">{m.country}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {teamInfo.contests.length > 0 && (
        <div className="card border border-primary/20 mb-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
            <Trophy size={16} className="text-primary" /> Contests ({teamInfo.contests.length})
          </h3>
          <div className="space-y-2">
            {teamInfo.contests.map((c) => {
              let position: string | null = null;
              try {
                const parsed = typeof c.winners === "string" ? JSON.parse(c.winners) : c.winners;
                if (parsed && typeof parsed === "object") {
                  const labels: Record<string, string> = { first: "1st", second: "2nd", third: "3rd" };
                  if (Array.isArray(parsed)) {
                    const idx = parsed.findIndex((w: any) => String(w).toLowerCase() === teamInfo.name.toLowerCase());
                    if (idx >= 0) position = idx === 0 ? "1st" : idx === 1 ? "2nd" : idx === 2 ? "3rd" : `#${idx + 1}`;
                  } else {
                    for (const [key, val] of Object.entries(parsed)) {
                      if (String(val).toLowerCase() === teamInfo.name.toLowerCase()) {
                        position = labels[key] || key;
                        break;
                      }
                    }
                  }
                }
              } catch {}
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-800/20 hover:bg-gray-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Trophy size={14} className="text-primary shrink-0" />
                    <a
                      href={`/contests/${c.id}`}
                      className="text-sm text-white hover:text-primary transition-colors truncate"
                    >
                      {c.name}
                    </a>
                    {c.ctftime_event_id && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-gray-800 rounded text-gray-500 font-mono border border-gray-700 shrink-0">
                        CTFtime
                      </span>
                    )}
                    {position && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 font-bold rounded border border-yellow-500/30 shrink-0">
                        {position}
                      </span>
                    )}
                  </div>
                  {c.event_date && (
                    <span className="text-[10px] text-gray-500 font-mono shrink-0 ml-2">
                      {new Date(c.event_date).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {teamInfo.ctftime_last_fetched && (
        <p className="text-[10px] text-gray-600 font-mono text-center">
          CTFtime data last fetched:{" "}
          {new Date(teamInfo.ctftime_last_fetched).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
