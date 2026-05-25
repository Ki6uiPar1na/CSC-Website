"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Search, FolderOpen, CheckCircle, Circle } from "lucide-react";
import { SearchBox } from "@/components/SearchBox";

interface Category {
  name: string;
  count: number;
  completed: number;
}

export default function ResourcesPage() {
  const router = useRouter();
  const { status } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const fetchData = async () => {
      try {
        const res = await fetch("/api/resources?limit=100");
        if (!res.ok) throw new Error("Failed to fetch resources");
        const data = await res.json();
        if (data.categories && data.categories.length > 0) {
          const cats = data.categories.map((c: any) => ({
            name: c.name,
            count: c.links.length,
            completed: c.links.filter((l: any) => l.is_completed).length,
          }));
          setCategories(cats);
        } else {
          setCategories([
            { name: "Web Exploitation", count: 3, completed: 0 },
            { name: "Reverse Engineering & Pwn", count: 3, completed: 0 },
            { name: "Cryptography", count: 3, completed: 0 },
            { name: "Forensics", count: 3, completed: 0 },
          ]);
        }
      } catch (err: any) {
        console.error("Fetch error:", err);
        setCategories([
          { name: "Web Exploitation", count: 3, completed: 0 },
          { name: "Reverse Engineering & Pwn", count: 3, completed: 0 },
          { name: "Cryptography", count: 3, completed: 0 },
          { name: "Forensics", count: 3, completed: 0 },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [status]);

  if (status === "loading" || (status === "authenticated" && isLoading)) {
    return <div className="p-12 text-center text-primary font-mono animate-pulse">Loading categories...</div>;
  }
  if (status === "unauthenticated") return null;

  const query = searchQuery.toLowerCase();
  const filtered = categories.filter(c => c.name.toLowerCase().includes(query));

  return (
    <div className="max-w-5xl mx-auto px-4">
      <h1 className="glitch-text text-3xl sm:text-4xl md:text-5xl mb-8 tracking-tight">Hacker's Toolkit</h1>
      <p className="text-gray-400 text-sm sm:text-base mb-8 max-w-2xl leading-relaxed">
        Curated resources and learning materials hand-picked by JKKNIU-CSC for your journey in cyber security.
      </p>

      <div className="mb-10 max-w-md">
        <SearchBox 
          query={searchQuery}
          setQuery={setSearchQuery}
          placeholder="Search categories..."
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-gray-900/30 border border-dashed border-gray-800 rounded-3xl">
          <Search size={48} className="mx-auto text-gray-700 mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No categories found</h3>
          <p className="text-gray-500">Try adjusting your search terms.</p>
          <button 
            onClick={() => setSearchQuery("")}
            className="btn btn-primary mt-6"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cat) => (
            <button
              key={cat.name}
              onClick={() => router.push(`/resources/${encodeURIComponent(cat.name)}`)}
              className="card text-left group hover:border-primary/50 transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <FolderOpen size={32} className="text-primary shrink-0 mt-1 group-hover:scale-110 transition-transform" />
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors truncate">{cat.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{cat.count} resource{cat.count !== 1 ? 's' : ''}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {cat.completed === cat.count && cat.count > 0 ? (
                      <span className="flex items-center gap-1 text-xs text-green-500">
                        <CheckCircle size={14} /> Completed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Circle size={14} /> {cat.completed}/{cat.count} done
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
