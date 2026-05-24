"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, ShieldCheck, CheckCircle, Search } from "lucide-react";
import { SearchBox } from "@/components/SearchBox";

interface Challenge {
  id: number;
  module_id: number;
  title: string;
  description: string;
  max_points: number;
  min_points: number;
  decay_limit: number;
  solve_count: number;
  current_points: number;
  is_premium: boolean;
  module_title: string;
}

function ChallengesContent() {
  const { data: session, status } = useSession();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [filteredChallenges, setFilteredChallenges] = useState<Challenge[]>([]);
  const [flags, setFlags] = useState<{ [key: number]: string }>({});
  const [messages, setMessages] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [solvedChallengeIds, setSolvedChallengeIds] = useState<number[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get("id");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    // Set a cookie for the 'Cookie Monster' challenge
    document.cookie = "challenge_flag=flag{cookies_are_tasty}; path=/; max-age=3600";
    
    fetch(`/api/challenges?page=${currentPage}&limit=15`)
      .then((res) => res.json())
      .then((data) => {
        setChallenges(data.challenges || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
        setLoading(false);
      });

    if (session) {
      fetch("/api/user/stats")
        .then(res => res.json())
        .then(data => {
          setIsSubscribed(data.isPremium === true);
          setSolvedChallengeIds(data.solves.map((s: any) => s.challenge_id));
        });
    }
  }, [session, status, router, currentPage]);

  // Filter challenges based on id query parameter and search query
  useEffect(() => {
    let filtered = challenges;
    
    // 1. Filter by ID if present
    if (challengeId) {
      filtered = filtered.filter(c => c.id === parseInt(challengeId));
    }
    
    // 2. Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.title.toLowerCase().includes(query) ||
        c.module_title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query)
      );
    }
    
    setFilteredChallenges(filtered);
  }, [challenges, challengeId, searchQuery]);

  const handleSubmit = async (challengeId: number) => {
    if (!session) {
      router.push("/login");
      return;
    }

    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        challengeId, 
        flag: flags[challengeId]
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessages({ ...messages, [challengeId]: data.message });
      setSolvedChallengeIds([...solvedChallengeIds, challengeId]);
      fetch("/api/challenges").then((res) => res.json()).then(d => setChallenges(d.challenges || []));
    } else {
      setMessages({ ...messages, [challengeId]: data.error });
    }
  };

  if (status === "loading" || loading) return <div className="p-8 text-center text-primary font-mono animate-pulse">Scanning for challenges...</div>;
  if (status === "unauthenticated") return null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* 
        DEBUG: The flag for 'Inspect Me' is: flag{welcome_to_ctf} 
      */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl mb-8 font-bold tracking-tight uppercase">
        {challengeId ? "Challenge" : "Challenges"}
      </h1>

      <div className="mb-10 max-w-md">
        <SearchBox 
          query={searchQuery}
          setQuery={setSearchQuery}
          placeholder="Search by title, module, or details..."
        />
      </div>

      <div className="flex flex-col gap-6">
        {Array.isArray(filteredChallenges) && filteredChallenges.length > 0 ? (
          filteredChallenges.map((challenge) => {
          const isLocked = !!challenge.is_premium && !isSubscribed;
          const isSolved = solvedChallengeIds.includes(challenge.id);
          
          return (
            <div key={challenge.id} className={`card relative overflow-hidden transition-all duration-300 ${isSolved ? 'border-accent/40 bg-accent/5' : (isLocked ? 'opacity-70 grayscale-[0.5]' : 'border-border-color')}`}>
              
              {/* Badge System */}
              <div className="absolute top-0 right-0 flex flex-row-reverse">
                {!!isSolved && (
                  <div className="bg-accent/20 text-accent text-[10px] font-bold px-3 py-1 flex items-center gap-1 border-l border-b border-accent/30 rounded-bl no-glow">
                    <CheckCircle size={10} /> SOLVED
                  </div>
                )}
                {!!isLocked && (
                  <div className="bg-error/20 text-error text-[10px] font-bold px-3 py-1 flex items-center gap-1 border-l border-b border-error/30 rounded-bl no-glow">
                    <Lock size={10} /> PREMIUM ONLY
                  </div>
                )}
                {!isLocked && !!challenge.is_premium && !isSolved && (
                  <div className="bg-primary/20 text-primary text-[10px] font-bold px-3 py-1 flex items-center gap-1 border-l border-b border-primary/30 rounded-bl no-glow">
                    <ShieldCheck size={10} /> PREMIUM
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                <div className="pr-16 sm:pr-0">
                  <span className="text-[10px] sm:text-xs font-mono text-primary uppercase tracking-wider">{challenge.module_title}</span>
                  <h3 className="text-xl sm:text-2xl font-bold mt-1">{challenge.title}</h3>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 w-full sm:w-auto">
                  <div className="text-lg sm:text-xl font-bold text-primary shrink-0">{challenge.current_points} <span className="text-[10px] text-gray-500 font-normal">pts</span></div>
                  <div className="text-[10px] text-gray-500 uppercase font-mono">{challenge.solve_count} solves</div>
                </div>
              </div>
              
              <p className="text-gray-400 text-sm sm:text-base leading-relaxed mb-6">{challenge.description}</p>
              
              {!session ? (
                <div className="mt-4 p-6 bg-black/40 border border-dashed border-border-color rounded text-center">
                  <p className="text-gray-500 text-sm mb-4">You must be logged in to capture this flag.</p>
                  <button 
                    className="accent w-full sm:w-auto px-8"
                    onClick={() => router.push("/register")}
                  >
                    Sign up to solve
                  </button>
                </div>
              ) : isLocked ? (
                <div className="mt-4 p-6 bg-error/5 border border-dashed border-error/30 rounded text-center">
                  <p className="text-error/70 text-sm mb-4 font-medium">Restricted content: Premium membership required.</p>
                  <button 
                    className="accent w-full sm:w-auto px-8"
                    onClick={() => router.push("/profile")}
                  >
                    Upgrade Account
                  </button>
                </div>
              ) : isSolved ? (
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <div className="flex-grow bg-accent/10 border border-accent/30 text-accent font-mono text-center py-2.5 rounded text-sm sm:text-base flex items-center justify-center gap-2">
                    <CheckCircle size={16} /> CHALLENGE COMPLETED
                  </div>
                  <button disabled className="opacity-40 cursor-not-allowed sm:w-32">SUBMITTED</button>
                </div>
              ) : (
                <div className="mt-4">
                  <form 
                    className="flex flex-col sm:flex-row gap-3" 
                    onSubmit={(e) => { e.preventDefault(); handleSubmit(challenge.id); }}
                  >
                    <input
                      type="text"
                      placeholder="CTF{flag_here}"
                      value={flags[challenge.id] || ""}
                      onChange={(e) => setFlags({ ...flags, [challenge.id]: e.target.value })}
                      className="flex-grow mb-0 py-2.5"
                    />
                    <button type="submit" className="sm:w-32 py-2.5">Submit</button>
                  </form>
                  {messages[challenge.id] && (
                    <p className={`mt-3 text-sm font-mono p-2 rounded ${messages[challenge.id].includes("Correct") ? "bg-accent/10 text-accent" : "bg-error/10 text-error"}`}>
                      {messages[challenge.id].includes("Correct") ? "> OK: " : "> ERR: "} {messages[challenge.id]}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })
        ) : (
          <div className="card bg-gray-900/50 border-border-color border-dashed text-center py-20">
            <Search size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-400 text-lg mb-4">
              {searchQuery ? "No matches found for your search." : (challengeId ? "Challenge not found." : "No challenges available.")}
            </p>
            {(challengeId || searchQuery) && (
              <button 
                onClick={() => {
                  router.push("/challenges");
                  setSearchQuery("");
                }}
                className="btn btn-primary mt-4"
              >
                View All Challenges
              </button>
            )}
          </div>
        )}
      </div>

      <div className="card mt-16 text-center border-dashed bg-primary/5">
        <h3 className="text-primary text-xl mb-3">Private Content</h3>
        <p className="text-gray-400 text-sm mb-8 max-w-lg mx-auto leading-relaxed">
          Unlock the full JKKNIU-CSC experience with advanced learning modules and member-exclusive challenges.
        </p>
        <div className="max-w-md mx-auto p-6 bg-black/40 border border-border-color rounded-lg">
          <h4 className="text-accent text-sm font-bold mb-2">Want more modules?</h4>
          <p className="text-[11px] text-gray-500 mb-6 font-mono">Explore our comprehensive library of specialized security materials.</p>
          <button 
            className="accent w-full"
            onClick={() => router.push("/materials")}
          >
            Access Learning Materials
          </button>
        </div>
      </div>
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

export default function ChallengesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-primary font-mono animate-pulse">Loading challenges...</div>}>
      <ChallengesContent />
    </Suspense>
  );
}
