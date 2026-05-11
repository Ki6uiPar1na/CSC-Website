"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { SearchBox } from "@/components/SearchBox";

interface Executive {
  id: number;
  name: string;
  role: string;
  bio: string;
  photo_url: string;
  year_joined: number;
  social_links?: string;
  session?: string;
}

interface SessionGroup {
  session: string;
  status: "current" | "past";
  executives: Executive[];
}

export default function ExecutiveBody() {
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [sessionGroups, setSessionGroups] = useState<SessionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExecutive, setSelectedExecutive] = useState<Executive | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const fetchExecutives = async () => {
      try {
        const response = await fetch("/api/executives", {
          cache: "no-store"
        });
        if (response.ok) {
          const data = await response.json();
          setExecutives(data);

          const grouped: Record<string, Executive[]> = {};
          data.forEach((executive: Executive) => {
            const session = executive.session || "2026-2027";
            if (!grouped[session]) {
              grouped[session] = [];
            }
            grouped[session].push(executive);
          });

          const sessions: SessionGroup[] = Object.entries(grouped)
            .sort(([a], [b]) => {
              const yearA = parseInt(a.split("-")[0]);
              const yearB = parseInt(b.split("-")[0]);
              return yearB - yearA;
            })
            .map(([session, execs]) => ({
              session,
              status: session === "2026-2027" ? "current" : "past",
              executives: execs,
            }));

          setSessionGroups(sessions);
          if (sessions.length > 0) {
            setExpandedSessions({ [sessions[0].session]: true });
          }
        } else {
          setSessionGroups([]);
          setExecutives([]);
        }
      } catch (error) {
        console.error("Failed to fetch executives:", error);
        setSessionGroups([]);
        setExecutives([]);
      } finally {
        setLoading(false);
      }
    };

    fetchExecutives();
  }, [hydrated]);

  const [filteredSessionGroups, setFilteredSessionGroups] = useState<SessionGroup[]>([]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSessionGroups(sessionGroups);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = sessionGroups.map(group => {
      const matchingExecs = group.executives.filter(e => 
        e.name.toLowerCase().includes(query) ||
        e.role.toLowerCase().includes(query) ||
        (e.bio && e.bio.toLowerCase().includes(query))
      );
      return { ...group, executives: matchingExecs };
    }).filter(group => group.executives.length > 0);

    setFilteredSessionGroups(filtered);
    
    // Automatically expand sessions with matches
    const newExpanded: Record<string, boolean> = {};
    filtered.forEach(g => {
      newExpanded[g.session] = true;
    });
    setExpandedSessions(prev => ({ ...prev, ...newExpanded }));

  }, [searchQuery, sessionGroups]);

  const getRoleOrder = (role: string): number => {
    const roleHierarchy: Record<string, number> = {
      "President": 1,
      "Vice President": 2,
      "Secretary": 3,
      "Treasurer": 4,
      "Technical Head": 5,
      "Member": 6,
    };
    return roleHierarchy[role] || 99;
  };

  const toggleSessionExpanded = (session: string) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [session]: !prev[session],
    }));
  };

  const parseSocialLinks = (socialLinksString?: string) => {
    if (!socialLinksString) return {};
    try {
      return JSON.parse(socialLinksString);
    } catch {
      return {};
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background via-background to-secondary/5">
      <div className="w-full flex justify-center">
        <div className="w-full max-w-6xl space-y-16">
          {/* Header */}
          <div className="text-center space-y-6">
            <div className="inline-block">
              <span className="inline-block px-4 py-1.5 bg-primary/10 border border-primary/30 text-primary rounded-full text-xs uppercase tracking-widest font-bold">
                Leadership Team
              </span>
            </div>
            <div className="space-y-3">
              <h1 className="text-5xl sm:text-6xl font-black text-foreground">
                Executive Body
              </h1>
              <p className="text-lg text-foreground/60 max-w-3xl mx-auto leading-relaxed">
                Meet the visionary leaders shaping JKKNIU Cyber Security Club and driving innovation in cybersecurity
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-4">
              <div className="w-12 h-1 bg-gradient-to-r from-primary via-accent to-primary rounded-full"></div>
              <div className="w-1 h-1 bg-primary/40 rounded-full mt-2"></div>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : executives.length === 0 ? (
            <div className="text-center py-20 space-y-6">
              <p className="text-foreground/60 text-lg">No executives found. Check back soon!</p>
              <Link href="/" className="inline-block px-6 py-2 border border-primary text-primary rounded-sm hover:bg-primary hover:text-black transition-colors duration-300">
                Back to Home
              </Link>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Search Bar */}
              <div className="max-w-md mx-auto">
                <SearchBox 
                  query={searchQuery}
                  setQuery={setSearchQuery}
                  placeholder="Search by name, role, or bio..."
                />
              </div>

              {/* Sessions */}
              {filteredSessionGroups.length === 0 ? (
                <div className="text-center py-20 bg-gray-900/30 border border-dashed border-gray-800 rounded-3xl">
                  <Search size={48} className="mx-auto text-gray-700 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">No members found</h3>
                  <p className="text-gray-500">Try adjusting your search terms.</p>
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="btn btn-primary mt-6 px-8"
                  >
                    View All
                  </button>
                </div>
              ) : (
                filteredSessionGroups.map((group) => (
                <div key={group.session} className="space-y-5">
                   {/* Session Header */}
                   <div 
                     onClick={() => toggleSessionExpanded(group.session)}
                     className="cursor-pointer group bg-gradient-to-r from-primary/8 via-accent/5 to-primary/8 border border-primary/25 rounded-2xl p-6 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300"
                   >
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-4">
                         <div className="w-1.5 h-12 bg-gradient-to-b from-primary to-accent rounded-full opacity-60 group-hover:opacity-100 transition-opacity"></div>
                         <div>
                           <h2 className="text-2xl font-bold text-foreground">{group.session}</h2>
                           <div className="mt-1.5">
                             {group.status === "current" ? (
                               <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/15 border border-green-500/30 text-green-400 rounded-lg text-xs font-bold">
                                 <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                 Active Session
                               </span>
                             ) : (
                               <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary/15 border border-primary/30 text-primary rounded-lg text-xs font-bold">
                                 <span className="w-2 h-2 bg-primary rounded-full"></span>
                                 Previous Session
                               </span>
                             )}
                           </div>
                         </div>
                       </div>
                       <div className="flex items-center gap-8">
                         <div className="text-right">
                           <p className="text-xs text-foreground/50 uppercase font-bold tracking-wider">Total Members</p>
                           <p className="text-2xl font-black text-primary">{group.executives.length}</p>
                         </div>
                         <span className={`text-2xl text-primary/60 group-hover:text-primary transition-all duration-300 ${expandedSessions[group.session] ? "rotate-180" : ""}`}>
                           ▼
                         </span>
                       </div>
                     </div>
                   </div>

                   {/* President & Vice President - Always visible */}
                   {expandedSessions[group.session] && (
                     <div className="space-y-6 pl-4">
                       {/* President & VP */}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {group.executives
                           .filter((e) => e.role === "President" || e.role === "Vice President")
                           .sort((a, b) => getRoleOrder(a.role) - getRoleOrder(b.role))
                           .map((executive) => (
                             <div
                               key={executive.id}
                               onClick={() => setSelectedExecutive(executive)}
                               className="group cursor-pointer bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/30 rounded-xl p-6 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/15 transition-all duration-300 transform hover:scale-105"
                             >
                               <div className="flex gap-5">
                                 {/* Photo */}
                                 {executive.photo_url ? (
                                   <div className="w-28 h-28 rounded-xl overflow-hidden flex-shrink-0 border border-primary/30 shadow-lg">
                                     <img
                                       src={executive.photo_url}
                                       alt={executive.name}
                                       className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                     />
                                   </div>
                                 ) : (
                                   <div className="w-28 h-28 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/30">
                                     <span className="text-4xl">👤</span>
                                   </div>
                                 )}
                                 {/* Info */}
                                 <div className="flex-1 flex flex-col justify-center gap-2">
                                   <div>
                                     <p className="text-xs uppercase text-primary font-black tracking-wider opacity-70">
                                       {executive.role}
                                     </p>
                                     <h3 className="text-xl font-black text-foreground mt-1">
                                       {executive.name}
                                     </h3>
                                   </div>
                                   {executive.bio && (
                                     <p className="text-sm text-foreground/60 line-clamp-2 leading-relaxed">
                                       {executive.bio}
                                     </p>
                                   )}
                                   <button className="mt-auto px-4 py-2 bg-gradient-to-r from-primary/20 to-accent/20 text-primary font-bold rounded-lg text-xs hover:from-primary/30 hover:to-accent/30 transition-all duration-200 border border-primary/30 w-fit">
                                     View Profile
                                   </button>
                                 </div>
                               </div>
                             </div>
                           ))}
                       </div>

                       {/* Other Members Grid */}
                       {group.executives.length > 2 && (
                         <div className="space-y-3">
                           <h3 className="text-sm uppercase font-bold text-foreground/70 tracking-wider">Committee Members</h3>
                           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                             {group.executives
                               .filter((e) => e.role !== "President" && e.role !== "Vice President")
                               .sort((a, b) => getRoleOrder(a.role) - getRoleOrder(b.role))
                               .map((executive) => (
                                 <div
                                   key={executive.id}
                                   onClick={() => setSelectedExecutive(executive)}
                                   className="group cursor-pointer bg-gradient-to-br from-primary/3 to-accent/3 border border-primary/20 rounded-lg p-4 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:scale-105"
                                 >
                                   <div className="flex gap-3">
                                     {executive.photo_url ? (
                                       <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-primary/20">
                                         <img
                                           src={executive.photo_url}
                                           alt={executive.name}
                                           className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                         />
                                       </div>
                                     ) : (
                                       <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                         <span className="text-xl">👤</span>
                                       </div>
                                     )}
                                     <div className="flex-1 flex flex-col justify-center gap-1">
                                       <p className="text-xs uppercase text-primary/70 font-bold">
                                         {executive.role}
                                       </p>
                                       <h4 className="text-sm font-bold text-foreground line-clamp-1">
                                         {executive.name}
                                       </h4>
                                     </div>
                                   </div>
                                 </div>
                               ))}
                           </div>
                         </div>
                       )}

                       {/* Full Committee Button */}
                       {group.executives.length > 5 && (
                         <div className="pt-2">
                           <Link
                             href={`/executive/${encodeURIComponent(group.session)}`}
                             className="inline-block w-full text-center px-6 py-3 bg-gradient-to-r from-primary to-accent text-black font-bold rounded-xl text-sm hover:shadow-lg hover:shadow-primary/40 transition-all duration-300 uppercase tracking-wider">
                             View Full Committee ({group.executives.length} Members)
                           </Link>
                         </div>
                       )}
                     </div>
                   )}
                 </div>
               )))}
            </div>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      {selectedExecutive && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 pt-20"
          onClick={() => setSelectedExecutive(null)}
        >
          <div
            className="bg-secondary border border-primary/30 rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-primary/30"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedExecutive(null)}
              className="absolute top-6 right-6 text-foreground/60 hover:text-foreground transition-colors duration-200 text-2xl font-bold"
            >
              ✕
            </button>

            <div className="space-y-6 mt-2">
              {/* Photo and Basic Info */}
              <div className="flex flex-col sm:flex-row gap-6 sm:items-start">
                {/* Photo */}
                {selectedExecutive.photo_url && (
                  <div className="w-40 h-40 flex-shrink-0 rounded-xl overflow-hidden border border-primary/30 shadow-lg">
                    <img
                      src={selectedExecutive.photo_url}
                      alt={selectedExecutive.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Name & Role */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-3xl font-black text-foreground">
                      {selectedExecutive.name}
                    </h2>
                    <p className="text-lg text-primary font-black uppercase tracking-wider mt-1">
                      {selectedExecutive.role}
                    </p>
                    <div className="w-12 h-1 bg-gradient-to-r from-primary to-accent rounded-full mt-3"></div>
                  </div>

                  {/* Quick Info */}
                  <div className="grid grid-cols-2 gap-3">
                    {selectedExecutive.year_joined && (
                      <div className="bg-primary/10 border border-primary/25 rounded-lg p-3">
                        <p className="text-xs uppercase text-primary/70 font-bold">Joined</p>
                        <p className="text-lg font-bold text-primary">{selectedExecutive.year_joined}</p>
                      </div>
                    )}
                    {selectedExecutive.session && (
                      <div className="bg-accent/10 border border-accent/25 rounded-lg p-3">
                        <p className="text-xs uppercase text-accent/70 font-bold">Session</p>
                        <p className="text-lg font-bold text-accent">{selectedExecutive.session}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio Section */}
              {selectedExecutive.bio && (
                <div className="space-y-3">
                  <p className="text-xs uppercase font-bold text-primary/70 tracking-wide">About</p>
                  <div className="bg-secondary/50 border border-primary/20 rounded-lg p-4">
                    <p className="text-foreground/75 leading-relaxed text-base">
                      {selectedExecutive.bio}
                    </p>
                  </div>
                </div>
              )}

              {/* Social Links */}
              {selectedExecutive.social_links && Object.keys(parseSocialLinks(selectedExecutive.social_links)).length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs uppercase font-bold text-primary/70 tracking-wide">Connect</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(parseSocialLinks(selectedExecutive.social_links)).map(
                      ([platform, link]: [string, any]) => (
                        <a
                          key={platform}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 border border-primary/60 text-primary font-bold rounded-lg transition-all duration-300 hover:bg-primary hover:text-black capitalize text-xs bg-primary/5"
                        >
                          {platform}
                        </a>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => setSelectedExecutive(null)}
                className="w-full px-4 py-3 bg-gradient-to-r from-primary to-accent text-black font-bold rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-primary/40 text-base"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
