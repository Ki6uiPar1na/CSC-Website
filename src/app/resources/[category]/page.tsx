"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { Search, CheckCircle, Circle, ChevronLeft } from "lucide-react";
import { SearchBox } from "@/components/SearchBox";

interface ResourceLink {
  id?: number;
  name: string;
  url: string;
  description?: string;
  action?: string;
  is_completed?: boolean;
  extraLinks?: { name: string; url: string }[];
}

export default function CategoryResourcesPage() {
  const router = useRouter();
  const { status } = useSession();
  const params = useParams();
  const category = decodeURIComponent(params.category as string);

  const [links, setLinks] = useState<ResourceLink[]>([]);
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

    const fetchResources = async () => {
      try {
        const res = await fetch(`/api/resources?category=${encodeURIComponent(category)}&limit=100`);
        if (!res.ok) throw new Error("Failed to fetch resources");
        const data = await res.json();
        if (data.categories && data.categories.length > 0) {
          setLinks(data.categories[0].links || []);
        }
      } catch (err: any) {
        console.error("Fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResources();
  }, [status, category]);

  const toggleComplete = async (resourceId: number, currentlyCompleted: boolean) => {
    try {
      const res = await fetch("/api/resources/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId, completed: !currentlyCompleted }),
      });
      if (!res.ok) throw new Error("Failed to toggle completion");
      const data = await res.json();
      setLinks(prev =>
        prev.map(link =>
          link.id === resourceId ? { ...link, is_completed: data.completed } : link
        )
      );
    } catch (err) {
      console.error("Toggle complete error:", err);
    }
  };

  if (status === "loading" || (status === "authenticated" && isLoading)) {
    return <div className="p-12 text-center text-primary font-mono animate-pulse">Loading resources...</div>;
  }
  if (status === "unauthenticated") return null;

  const query = searchQuery.toLowerCase();
  const filtered = links.filter(link =>
    link.name.toLowerCase().includes(query) ||
    (link.description && link.description.toLowerCase().includes(query))
  );

  return (
    <div className="max-w-5xl mx-auto px-4">
      <button
        onClick={() => router.push("/resources")}
        className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors font-mono text-sm mb-6"
      >
        <ChevronLeft size={16} /> BACK TO ALL RESOURCES
      </button>

      <h1 className="glitch-text text-3xl sm:text-4xl md:text-5xl mb-2 tracking-tight">{category}</h1>
      <p className="text-gray-400 text-sm mb-8 max-w-2xl leading-relaxed">
        Resources in the {category} category.
      </p>

      <div className="mb-10 max-w-md">
        <SearchBox
          query={searchQuery}
          setQuery={setSearchQuery}
          placeholder="Search within this category..."
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-gray-900/30 border border-dashed border-gray-800 rounded-3xl">
          <Search size={48} className="mx-auto text-gray-700 mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No resources found</h3>
          <p className="text-gray-500">Try adjusting your search terms.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-color text-gray-500 uppercase tracking-wider text-xs">
                <th className="text-left py-3 px-4 font-medium">Material</th>
                <th className="text-center py-3 px-4 font-medium w-24">Action</th>
                <th className="text-center py-3 px-4 font-medium w-20">Done</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((link, i) => (
                <tr key={link.id || i} className={`border-b border-border-color/50 hover:bg-white/[0.02] transition-colors ${link.is_completed ? 'opacity-60' : ''}`}>
                  <td className="py-3 px-4">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-200 hover:text-primary transition-colors font-medium"
                    >
                      {link.name}
                    </a>
                    {link.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{link.description}</p>
                    )}
                    {link.extraLinks && link.extraLinks.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {link.extraLinks.map((extra, ei) => (
                          <a
                            key={ei}
                            href={extra.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-accent hover:underline"
                          >
                            [{extra.name}]
                          </a>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center align-top">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                      link.action === "Watch" ? "bg-red-500/10 text-red-400" :
                      link.action === "Tools" ? "bg-orange-500/10 text-orange-400" :
                      link.action === "Practice" ? "bg-purple-500/10 text-purple-400" :
                      link.action === "Article" ? "bg-blue-500/10 text-blue-400" :
                      link.action === "Course" ? "bg-teal-500/10 text-teal-400" :
                      "bg-green-500/10 text-green-400"
                    }`}>
                      {link.action || "Read"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center align-top">
                    <button
                      onClick={() => link.id && toggleComplete(link.id, !!link.is_completed)}
                      className="text-gray-500 hover:text-primary transition-colors"
                      title={link.is_completed ? "Mark incomplete" : "Mark complete"}
                    >
                      {link.is_completed ? (
                        <CheckCircle size={18} className="text-green-500" />
                      ) : (
                        <Circle size={18} />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
