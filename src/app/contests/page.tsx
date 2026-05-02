"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { SearchBox } from "@/components/SearchBox";

interface Contest {
  id: number;
  name: string;
  description: string;
  event_date: string;
  winners: string | any[];
  photo_url: string;
  details: string;
}

export default function ContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchContests = async () => {
      try {
        const response = await fetch("/api/contests");
        if (response.ok) {
          const data = await response.json();
          setContests(data);
        }
      } catch (error) {
        console.error("Failed to fetch contests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContests();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredContests = contests.filter(contest => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return contest.name.toLowerCase().includes(query) ||
           contest.description.toLowerCase().includes(query) ||
           (contest.details && contest.details.toLowerCase().includes(query));
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-900 to-black py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-5xl sm:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent mb-4">
            Contests & Competitions
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto font-light">
            Showcasing our achievements in cybersecurity competitions and hackathons
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{contests.length}</p>
              <p className="text-sm text-gray-400">Total Contests</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-12 max-w-md mx-auto">
          <SearchBox 
            query={searchQuery}
            setQuery={setSearchQuery}
            placeholder="Search contests by name or details..."
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : contests.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-6">No contests found yet.</p>
            <Link 
              href="/" 
              className="inline-block px-8 py-3 border border-primary text-primary hover:bg-primary hover:text-black transition-all duration-300 rounded-lg font-semibold"
            >
              Back to Home
            </Link>
          </div>
        ) : filteredContests.length === 0 ? (
          <div className="text-center py-20 bg-gray-900/30 border border-dashed border-gray-800 rounded-3xl">
            <Search size={48} className="mx-auto text-gray-700 mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No matches found</h3>
            <p className="text-gray-500">Try adjusting your search terms.</p>
            <button 
              onClick={() => setSearchQuery("")}
              className="btn btn-primary mt-6 px-8"
            >
              View All
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredContests.map((contest) => (
              <div
                key={contest.id}
                className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 hover:border-primary/50 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/20"
              >
                {/* Compact View */}
                {expandedId !== contest.id && (
                  <div 
                    onClick={() => setExpandedId(contest.id)}
                    className="cursor-pointer p-6 hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-6">
                      {contest.photo_url && (
                        <img
                          src={contest.photo_url}
                          alt={contest.name}
                          className="w-24 h-24 object-cover rounded-lg border border-primary/30 flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
                          {contest.name}
                        </h3>
                        <p className="text-primary text-sm font-mono mb-2">
                          📅 {formatDate(contest.event_date)}
                        </p>
                        <p className="text-gray-300 text-sm line-clamp-1">
                          {contest.description}
                        </p>
                      </div>
                      <button
                        className="flex-shrink-0 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg font-semibold transition-all duration-300 text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(contest.id);
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded View */}
                {expandedId === contest.id && (
                  <div className="p-8 animate-in fade-in duration-300">
                    <div className="flex items-start justify-between mb-6">
                      <h2 className="text-3xl font-bold text-primary">{contest.name}</h2>
                      <button
                        onClick={() => setExpandedId(null)}
                        className="text-gray-400 hover:text-white transition-colors text-2xl"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {contest.photo_url && (
                        <div className="md:col-span-1">
                          <img
                            src={contest.photo_url}
                            alt={contest.name}
                            className="w-full h-64 object-cover rounded-lg border border-primary/30"
                          />
                        </div>
                      )}

                      <div className={contest.photo_url ? "md:col-span-2" : "md:col-span-3"}>
                        <div className="mb-6">
                          <p className="text-primary text-sm font-mono uppercase tracking-widest mb-4">
                            📅 {formatDate(contest.event_date)}
                          </p>
                          <p className="text-gray-300 mb-6 leading-relaxed">
                            {contest.description}
                          </p>
                        </div>

                        {contest.winners && (contest.winners as any).length > 0 && (
                          <div className="mb-6 bg-slate-800/50 rounded-lg p-4 border border-primary/20">
                            <h3 className="font-bold text-accent mb-3 text-lg">🏆 Winners</h3>
                            <ul className="space-y-2">
                              {(() => {
                                const winnersArray = typeof contest.winners === 'string' 
                                  ? JSON.parse(contest.winners) 
                                  : Array.isArray(contest.winners) ? contest.winners : [];
                                return winnersArray.map((winner: any, idx: number) => (
                                  <li key={idx} className="flex items-center gap-3 text-gray-300">
                                    <span className="text-lg">
                                      {idx === 0
                                        ? "🥇"
                                        : idx === 1
                                          ? "🥈"
                                          : idx === 2
                                            ? "🥉"
                                            : "•"}
                                    </span>
                                    <span>
                                      {typeof winner === "string"
                                        ? winner
                                        : winner.name || JSON.stringify(winner)}
                                    </span>
                                  </li>
                                ));
                              })()}
                            </ul>
                          </div>
                        )}

                        {contest.details && (
                          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                            <h3 className="font-bold text-white mb-2">📝 Details</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                              {contest.details}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedId(null)}
                      className="mt-6 px-6 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg font-semibold transition-all duration-300"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
