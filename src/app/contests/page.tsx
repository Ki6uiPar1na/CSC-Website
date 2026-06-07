"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  team_name?: string | null;
}

export default function ContestsPage() {
  const router = useRouter();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const fetchContests = async () => {
      try {
        const response = await fetch(`/api/contests?page=${currentPage}&limit=15`, {
          cache: "no-store"
        });
        if (response.ok) {
          const data = await response.json();
          setContests(Array.isArray(data.contests) ? data.contests : []);
          setTotalPages(data.totalPages || 1);
          setTotal(data.total || 0);
        } else {
          setContests([]);
        }
      } catch (error) {
        console.error("Failed to fetch contests:", error);
        setContests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchContests();
  }, [hydrated, currentPage]);

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
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6">
                    {contest.photo_url && (
                      <img
                        src={contest.photo_url}
                        alt={contest.name}
                        className="w-full sm:w-24 h-48 sm:h-24 object-cover rounded-lg border border-primary/30 flex-shrink-0 sm:block"
                      />
                    )}
                    <div className="flex-1 min-w-0 order-first sm:order-none">
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
                        {contest.name}
                      </h3>
                      <p className="text-primary text-xs sm:text-sm font-mono mb-2">
                        📅 {formatDate(contest.event_date)}
                      </p>
                      <p className="text-gray-300 text-sm line-clamp-1 sm:line-clamp-2">
                        {contest.description}
                      </p>
                      {contest.team_name && (
                        <p className="text-xs text-primary font-mono mt-2 flex items-center gap-1">
                          Team: {contest.team_name}
                        </p>
                      )}
                    </div>
                    <button
                      className="w-full sm:w-auto flex-shrink-0 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg font-semibold transition-all duration-300 text-sm"
                      onClick={() => router.push(`/contests/${contest.id}`)}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
    </div>
  );
}
