"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Trophy, Calendar, Zap, BookOpen, ArrowRight, Loader2 } from "lucide-react";

interface SearchResult {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  type: 'achievement' | 'event' | 'challenge' | 'resource';
  link: string;
}

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setResults(data.results || []);
      } catch (error) {
        console.error("Search fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'achievement': return <Trophy className="text-yellow-500" />;
      case 'event': return <Calendar className="text-blue-500" />;
      case 'challenge': return <Zap className="text-primary" />;
      case 'resource': return <BookOpen className="text-green-500" />;
      default: return <Search />;
    }
  };

  return (
    <div className="min-h-screen py-20 bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-4xl font-bold mb-4 flex items-center gap-3 sm:gap-4">
            <Search size={24} className="text-primary shrink-0" />
            <span className="break-words">Search Results</span>
          </h1>
          <p className="text-gray-400">
            Showing results for: <span className="text-white font-bold italic">"{query}"</span>
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary mb-4" size={48} />
            <p className="text-gray-400 font-mono animate-pulse">SEARCHING THE MATRIX...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20 bg-gray-900/30 border border-dashed border-gray-800 rounded-3xl">
            <Search size={64} className="mx-auto mb-6 text-gray-700" />
            <h2 className="text-2xl font-bold mb-2">No matches found</h2>
            <p className="text-gray-500">Try adjusting your search terms or browsing our categories.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 font-mono mb-6">{results.length} RESULTS FOUND</p>
            {results.map((result, idx) => (
              <Link 
                key={`${result.type}-${result.id}-${idx}`}
                href={result.link}
                className="block group"
              >
                <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 hover:border-primary/50 transition-all duration-300 hover:bg-gray-900/60 shadow-lg hover:shadow-primary/5">
                  <div className="flex items-start gap-3 sm:gap-5">
                    <div className="p-2 sm:p-3 bg-white/5 rounded-xl group-hover:bg-primary/10 transition-colors shrink-0">
                      {getIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 mb-1">
                        <h3 className="text-base sm:text-xl font-bold text-white group-hover:text-primary transition-colors truncate">
                          {result.title}
                        </h3>
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-white/5 text-gray-500 border border-white/10 group-hover:border-primary/30 group-hover:text-primary/70 transition-all w-fit">
                          {result.type}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-primary/70 font-semibold mb-2">{result.subtitle}</p>
                      <p className="text-xs sm:text-sm text-gray-400 line-clamp-2 break-all">
                        {result.description}
                      </p>
                      <div className="mt-3 sm:mt-4 flex items-center gap-2 text-xs font-bold text-gray-500 group-hover:text-primary transition-colors">
                        GO TO {result.type.toUpperCase()} <ArrowRight size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    }>
      <SearchResults />
    </Suspense>
  );
}
