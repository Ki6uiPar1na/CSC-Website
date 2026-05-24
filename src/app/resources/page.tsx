"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Search } from "lucide-react";
import { SearchBox } from "@/components/SearchBox";

interface ResourceLink {
  id?: number;
  name: string;
  url: string;
  description?: string;
  extraLinks?: { name: string; url: string }[];
}

interface Category {
  name: string;
  links: ResourceLink[];
}

const fallbackResources: Category[] = [
  {
    name: "Web Exploitation",
    links: [
      { name: "PortSwigger Web Security Academy", url: "https://portswigger.net/web-security" },
      { name: "OWASP Top Ten Project", url: "https://owasp.org/www-project-top-ten/" },
      { name: "PaylaodsAllTheThings", url: "https://github.com/swisskyrepo/PayloadsAllTheThings" }
    ]
  },
  {
    name: "Reverse Engineering & Pwn",
    links: [
      { name: "LiveOverflow YouTube Series", url: "https://www.youtube.com/c/LiveOverflow" },
      { name: "Nightmare (CTF Pwn Course)", url: "https://guyinatuxedo.github.io/index.html" },
      { name: "How2Heap", url: "https://github.com/shellphish/how2heap" }
    ]
  },
  {
    name: "Cryptography",
    links: [
      { name: "CryptoHack", url: "https://cryptohack.org/" },
      { name: "CryptoPals Challenges", url: "https://cryptopals.com/" },
      { name: "CyberChef Tool", url: "https://gchq.github.io/CyberChef/" }
    ]
  },
  {
    name: "Forensics",
    links: [
      { name: "Forensics Wiki", url: "https://forensicswiki.xyz/page/Main_Page" },
      { name: "Volatility Framework", url: "https://www.volatilityfoundation.org/" },
      { name: "Auri's Forensics Writeups", url: "https://github.com/Auri-M/CTF-Writeups" }
    ]
  }
];

export default function ResourcesPage() {
  const router = useRouter();
  const { status } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

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
        const res = await fetch(`/api/resources?page=${currentPage}&limit=15`);
        if (!res.ok) throw new Error("Failed to fetch resources");
        const data = await res.json();
        if (data.categories && data.categories.length > 0) {
          setCategories(data.categories);
          setTotalPages(data.totalPages || 1);
          setTotal(data.total || 0);
        } else {
          setCategories(fallbackResources);
        }
      } catch (err: any) {
        console.error("Fetch error, using fallback:", err);
        setCategories(fallbackResources);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResources();
  }, [status, currentPage]);

  if (status === "loading" || (status === "authenticated" && isLoading)) {
    return <div className="p-12 text-center text-primary font-mono animate-pulse">Loading resources...</div>;
  }
  if (status === "unauthenticated") return null;

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
          placeholder="Search tools, platforms, or topics..."
        />
      </div>

      {(() => {
        const query = searchQuery.toLowerCase();
        const filteredCategories = categories.map(cat => {
          const catNameMatch = cat.name.toLowerCase().includes(query);
          const filteredLinks = cat.links.filter(link => 
            catNameMatch || 
            link.name.toLowerCase().includes(query) || 
            (link.description && link.description.toLowerCase().includes(query))
          );
          return { ...cat, links: filteredLinks };
        }).filter(cat => cat.links.length > 0);

        if (filteredCategories.length === 0) {
          return (
            <div className="text-center py-20 bg-gray-900/30 border border-dashed border-gray-800 rounded-3xl">
              <Search size={48} className="mx-auto text-gray-700 mb-4" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No matches found</h3>
              <p className="text-gray-500">Try adjusting your search terms.</p>
              <button 
                onClick={() => setSearchQuery("")}
                className="btn btn-primary mt-6"
              >
                Clear Search
              </button>
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCategories.map((category, index) => (
              <div key={index} className="card group">
                <h2 className="text-primary text-lg font-bold border-b border-border-color pb-3 mb-6 flex items-center justify-between">
                  <span>{category.name}</span>
                  <span className="text-[10px] bg-primary/10 px-2 py-0.5 rounded text-primary/70">{category.links.length} LINKS</span>
                </h2>
                <ul className="space-y-4">
                  {category.links.map((link, lIndex) => (
                    <li key={link.id || lIndex}>
                      <div className="flex flex-col gap-1">
                        <a 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-gray-300 hover:text-primary transition-all duration-200 group/link"
                        >
                          <span className="text-accent group-hover/link:translate-x-1 transition-transform">→</span> 
                          <span className="text-sm sm:text-base font-medium underline-offset-4 group-hover/link:underline">{link.name}</span>
                        </a>
                        {link.description && (
                          <p className="text-xs text-gray-500 ml-6">{link.description}</p>
                        )}
                        {link.extraLinks && link.extraLinks.length > 0 && (
                          <div className="flex flex-wrap gap-2 ml-6 mt-1">
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
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        );
      })()}

      <div className="card mt-16 text-center bg-primary/5 border-dashed">
        <h3 className="text-primary text-xl font-bold mb-4">Private Resources</h3>
        <p className="text-gray-400 text-sm sm:text-base mb-8 max-w-xl mx-auto leading-relaxed">
          Exclusive deep-dive resources and structured learning materials available only for JKKNIU-CSC verified members.
        </p>
        <div className="max-w-lg mx-auto p-6 sm:p-8 bg-black/40 border border-border-color rounded-xl">
          <h4 className="text-accent text-lg font-bold mb-2 uppercase tracking-wider">Learning Material</h4>
          <p className="text-xs sm:text-sm text-gray-500 mb-8 font-mono leading-relaxed">
            [ SECURE ACCESS ] Structured theory and advanced practical guides for all skill levels.
          </p>
          <button 
            className="accent w-full py-3 text-lg font-bold" 
            onClick={() => router.push("/materials")}
          >
            Access Academy Materials
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
