"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { SearchBox } from "@/components/SearchBox";

interface Alumni {
  id: number;
  name: string;
  session: string;
  graduation_year?: number;
  role_title: string;
  bio: string;
  photo_url: string;
  achievements: string;
}

const SAMPLE_ALUMNI: Alumni[] = [
  {
    id: 1,
    name: "Md. Hasan Ali",
    session: "2021-2022",
    role_title: "Security Researcher at Google",
    bio: "Leading security research initiatives and contributing to open-source cybersecurity projects. Passionate about vulnerability disclosure and ethical hacking.",
    photo_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Hasan",
    achievements: "Bug Bounty Champion 2023, Published 15+ CVEs, Speaker at Black Hat USA 2024"
  },
  {
    id: 2,
    name: "Fatima Rahman",
    session: "2021-2022",
    role_title: "Penetration Tester at CyberShield Inc",
    bio: "Expert in web application security and network penetration testing. Helped numerous enterprises secure their infrastructure.",
    photo_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Fatima",
    achievements: "OSCP Certified, Top Hacker on HackTheBox, Published 8 research papers"
  },
  {
    id: 3,
    name: "Karim Hassan",
    session: "2020-2021",
    role_title: "CISO at TechCorp Bangladesh",
    bio: "Chief Information Security Officer overseeing enterprise security strategy and compliance. 10+ years in cybersecurity.",
    photo_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Karim",
    achievements: "CISSP Certified, Led ISO 27001 Implementation, 5 years consecutive best CISO award"
  },
  {
    id: 4,
    name: "Nusrat Jahan",
    session: "2023-2024",
    role_title: "Incident Response Analyst at SecureNet",
    bio: "Specializing in malware analysis and incident response. Recently graduated and already making significant contributions to the field.",
    photo_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Nusrat",
    achievements: "Won JKKNIU CTF 2024, Certified in GIAC Certified Incident Handler"
  },
  {
    id: 5,
    name: "Riyad Shahriar",
    session: "2020-2021",
    role_title: "Blockchain Security Engineer at Web3 Labs",
    bio: "Pioneering blockchain security solutions and smart contract audits. Passionate about decentralized security.",
    photo_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Riyad",
    achievements: "Audited $500M+ in smart contracts, Published 20+ security advisories"
  },
  {
    id: 6,
    name: "Isha Dutta",
    session: "2021-2022",
    role_title: "Cloud Security Architect at AWS Bangladesh",
    bio: "Designing and implementing cloud security solutions for enterprise clients. AWS Certified Security Specialist.",
    photo_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Isha",
    achievements: "AWS Security Competency Partner, Trained 500+ professionals on cloud security"
  },
  {
    id: 7,
    name: "Sohel Rana",
    session: "2019-2020",
    role_title: "Founder & CEO of SecureStart (Startup)",
    bio: "Founded a cybersecurity startup focused on IoT security solutions. Building innovative products for enterprise clients.",
    photo_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sohel",
    achievements: "Startup funded by top VCs, 50+ enterprise clients, Winner of multiple startup competitions"
  },
  {
    id: 8,
    name: "Priya Sharma",
    session: "2023-2024",
    role_title: "Security Operations Center (SOC) Analyst at InfoSec Pro",
    bio: "Monitoring and responding to security threats in real-time. Recently joined the industry with strong technical foundations.",
    photo_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
    achievements: "First-year performance award, JKKNIU Security Challenge Winner 2024"
  },
  {
    id: 9,
    name: "Arjun Patel",
    session: "2020-2021",
    role_title: "Application Security Engineer at Meta",
    bio: "Securing applications at scale for one of the world's largest tech companies. Focus on secure development practices.",
    photo_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun",
    achievements: "Discovered critical vulnerability in Meta, Published research in IEEE, Speaker at USENIX Security"
  }
];

export default function AlumniPage() {
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
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

    const fetchAlumni = async () => {
      try {
        const response = await fetch(`/api/alumni?page=${currentPage}&limit=15`, {
          cache: "no-store"
        });
        if (response.ok) {
          const data = await response.json();
          setAlumni(Array.isArray(data.alumni) ? data.alumni : SAMPLE_ALUMNI);
          setTotalPages(data.totalPages || 1);
          setTotal(data.total || 0);
        } else {
          // Use sample data as fallback
          setAlumni(SAMPLE_ALUMNI);
        }
      } catch (error) {
        console.error("Failed to fetch alumni:", error);
        // Use sample data on error
        setAlumni(SAMPLE_ALUMNI);
      } finally {
        setLoading(false);
      }
    };

    fetchAlumni();
  }, [hydrated, currentPage]);

  const sessions = Array.from(new Set(alumni.map((a) => a.session))).sort(
    (a, b) => {
      const [yearA] = a.split('-').map(Number);
      const [yearB] = b.split('-').map(Number);
      return yearB - yearA;
    }
  );

  const filteredAlumni = alumni.filter(alum => {
    // 1. Filter by session
    if (selectedSession && alum.session !== selectedSession) return false;
    
    // 2. Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return alum.name.toLowerCase().includes(query) ||
             (alum.role_title && alum.role_title.toLowerCase().includes(query)) ||
             (alum.bio && alum.bio.toLowerCase().includes(query)) ||
             (alum.achievements && alum.achievements.toLowerCase().includes(query));
    }
    
    return true;
  });

  return (
    <div className="min-h-screen py-20 bg-gradient-to-b from-background via-background/95 to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-block mb-4">
            <span className="text-primary font-mono text-sm tracking-widest uppercase">Our Legacy</span>
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary">
            Meet Our Alumni
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Meet the cybersecurity professionals who started their journey with us and are now making an impact in the industry worldwide
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-12 max-w-md mx-auto">
          <SearchBox 
            query={searchQuery}
            setQuery={setSearchQuery}
            placeholder="Search alumni by name, role, or session..."
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : alumni.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-6">No alumni found yet.</p>
            <Link href="/" className="inline-block px-8 py-3 bg-gradient-to-r from-primary to-accent text-black font-semibold hover:shadow-lg hover:shadow-primary/50 transition-all duration-300 rounded-lg">
              Back to Home
            </Link>
          </div>
        ) : (
          <>
            {/* Session Filter */}
            {sessions.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3 mb-16">
                <button
                  onClick={() => setSelectedSession(null)}
                  className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 ${
                    selectedSession === null
                      ? "bg-gradient-to-r from-primary to-accent text-black shadow-lg shadow-primary/50"
                      : "bg-secondary/50 border border-primary/30 text-foreground hover:border-primary hover:bg-secondary/80"
                  }`}
                >
                  All Sessions
                </button>
                {sessions.map((session) => (
                  <button
                    key={session}
                    onClick={() => setSelectedSession(session)}
                    className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 ${
                      selectedSession === session
                        ? "bg-gradient-to-r from-primary to-accent text-black shadow-lg shadow-primary/50"
                        : "bg-secondary/50 border border-primary/30 text-foreground hover:border-primary hover:bg-secondary/80"
                    }`}
                  >
                    {session}
                  </button>
                ))}
              </div>
            )}

            {/* Alumni Grid */}
            {filteredAlumni.length === 0 ? (
              <div className="text-center py-20 bg-gray-900/30 border border-dashed border-gray-800 rounded-3xl">
                <Search size={48} className="mx-auto text-gray-700 mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No alumni found</h3>
                <p className="text-gray-500">Try adjusting your search terms or filters.</p>
                <button 
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedSession(null);
                  }}
                  className="btn btn-primary mt-6 px-8"
                >
                  Clear All
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAlumni.map((alum) => (
                <div
                  key={alum.id}
                  className="group relative h-full"
                >
                  {/* Compact Card */}
                  <div
                    onClick={() => setExpandedId(expandedId === alum.id ? null : alum.id)}
                    className={`card p-6 h-full cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                      expandedId === alum.id ? "ring-2 ring-primary" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      {alum.photo_url && (
                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/50 group-hover:border-primary transition-colors">
                            <img
                              src={alum.photo_url}
                              alt={alum.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold truncate">{alum.name}</h3>
                        <p className="text-primary text-xs font-mono uppercase tracking-wide">
                          Session {alum.session}
                        </p>
                      </div>
                    </div>

                    {alum.role_title && (
                      <p className="text-accent text-sm font-semibold mb-3 line-clamp-2">
                        {alum.role_title}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <button className="text-primary hover:text-accent text-sm font-semibold transition-colors">
                        View Details →
                      </button>
                      {alum.achievements && (
                        <span className="text-xs text-gray-500 bg-secondary/50 px-3 py-1 rounded-full">
                          ⭐ Achievements
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details - Modal Overlay */}
                  {expandedId === alum.id && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                      <div className="bg-secondary border border-primary/30 rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start gap-6 mb-6">
                          {alum.photo_url && (
                            <div className="flex-shrink-0">
                              <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-primary">
                                <img
                                  src={alum.photo_url}
                                  alt={alum.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                          )}
                          <div className="flex-1">
                            <h2 className="text-3xl font-bold mb-2">{alum.name}</h2>
                            <p className="text-primary text-sm font-mono uppercase tracking-widest mb-1">
                              Session {alum.session}
                            </p>
                            <p className="text-accent text-lg font-semibold">
                              {alum.role_title}
                            </p>
                          </div>
                          <button
                            onClick={() => setExpandedId(null)}
                            className="text-gray-400 hover:text-foreground text-2xl"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="space-y-6">
                          {alum.bio && (
                            <div>
                              <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
                                About
                              </h3>
                              <p className="text-gray-300 leading-relaxed">
                                {alum.bio}
                              </p>
                            </div>
                          )}

                          {alum.achievements && (
                            <div>
                              <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
                                Achievements
                              </h3>
                              <p className="text-gray-300 leading-relaxed">
                                {alum.achievements}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
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
