"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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

export default function CommitteeDetail() {
  const params = useParams();
  const session = decodeURIComponent(params.session as string);
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExecutive, setSelectedExecutive] = useState<Executive | null>(null);

  useEffect(() => {
    const fetchExecutives = async () => {
      try {
        const response = await fetch("/api/executives");
        if (response.ok) {
          const data = await response.json();
          const filtered = data.filter((e: Executive) => (e.session || "2026-2027") === session);
          setExecutives(filtered);
        }
      } catch (error) {
        console.error("Failed to fetch executives:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExecutives();
  }, [session]);

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

  const parseSocialLinks = (socialLinksString?: string) => {
    if (!socialLinksString) return {};
    try {
      return JSON.parse(socialLinksString);
    } catch {
      return {};
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-secondary/20">
      <div className="w-full flex justify-center">
        <div className="w-full max-w-6xl space-y-12">
          {/* Header */}
          <div className="text-center space-y-6">
            <Link href="/executive" className="inline-flex items-center gap-2 text-primary hover:text-accent transition-colors duration-300">
              ← Back to Sessions
            </Link>
            <div className="space-y-3">
              <h1 className="text-5xl sm:text-6xl font-bold text-foreground">
                {session} Committee
              </h1>
              <p className="text-lg text-foreground/70">
                Full committee members for this session
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <div className="w-12 h-1 bg-gradient-to-r from-primary to-accent rounded-full"></div>
              <div className="w-3 h-1 bg-primary/40 rounded-full"></div>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : executives.length === 0 ? (
            <div className="text-center py-20 space-y-6">
              <p className="text-foreground/60 text-lg">No committee members found for this session.</p>
              <Link href="/executive" className="inline-block px-6 py-2 border border-primary text-primary rounded-sm hover:bg-primary hover:text-black transition-colors duration-300">
                Back to Sessions
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {executives
                .sort((a, b) => getRoleOrder(a.role) - getRoleOrder(b.role))
                .map((executive) => (
                  <div
                    key={executive.id}
                    onClick={() => setSelectedExecutive(executive)}
                    className="group cursor-pointer bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/30 rounded-xl p-6 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300"
                  >
                    <div className="space-y-4">
                      {/* Photo */}
                      {executive.photo_url ? (
                        <div className="w-full h-48 rounded-lg overflow-hidden">
                          <img
                            src={executive.photo_url}
                            alt={executive.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-48 rounded-lg bg-primary/10 flex items-center justify-center">
                          <span className="text-5xl">👤</span>
                        </div>
                      )}
                      {/* Info */}
                      <div>
                        <p className="text-xs uppercase text-primary/60 font-bold tracking-wide">
                          {executive.role}
                        </p>
                        <h3 className="text-xl font-bold text-foreground line-clamp-2 mt-1">
                          {executive.name}
                        </h3>
                        {executive.bio && (
                          <p className="text-sm text-foreground/60 line-clamp-2 mt-2">
                            {executive.bio}
                          </p>
                        )}
                        <button className="mt-3 px-4 py-1 bg-primary/20 text-primary rounded font-semibold text-sm hover:bg-primary hover:text-black transition-colors duration-200 w-full">
                          View Profile
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      {selectedExecutive && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 pt-24"
          onClick={() => setSelectedExecutive(null)}
        >
          <div
            className="bg-secondary border border-primary/40 rounded-2xl p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl shadow-primary/40"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedExecutive(null)}
              className="absolute top-6 right-6 text-foreground/60 hover:text-foreground transition-colors duration-200 text-2xl font-bold"
            >
              ✕
            </button>

            <div className="space-y-6">
              {/* Photo and Basic Info */}
              <div className="flex flex-col sm:flex-row gap-6 sm:items-start">
                {/* Photo */}
                {selectedExecutive.photo_url && (
                  <div className="w-40 h-40 flex-shrink-0 rounded-xl overflow-hidden border-2 border-primary/40">
                    <img
                      src={selectedExecutive.photo_url}
                      alt={selectedExecutive.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Name & Role */}
                <div className="flex-1 space-y-3">
                  <div>
                    <h2 className="text-3xl font-bold text-foreground mb-2">
                      {selectedExecutive.name}
                    </h2>
                    <p className="text-lg text-primary font-bold uppercase tracking-wide">
                      {selectedExecutive.role}
                    </p>
                    <div className="w-12 h-1 bg-gradient-to-r from-primary to-accent rounded-full mt-2"></div>
                  </div>

                  {/* Quick Info */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {selectedExecutive.year_joined && (
                      <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                        <p className="text-xs uppercase text-primary/70 font-bold">Joined</p>
                        <p className="text-lg font-bold text-primary">{selectedExecutive.year_joined}</p>
                      </div>
                    )}
                    {selectedExecutive.session && (
                      <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
                        <p className="text-xs uppercase text-accent/70 font-bold">Session</p>
                        <p className="text-lg font-bold text-accent">{selectedExecutive.session}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio Section */}
              {selectedExecutive.bio && (
                <div className="space-y-2">
                  <p className="text-xs uppercase font-bold text-primary/70 tracking-wide">About</p>
                  <div className="bg-secondary/50 border border-primary/20 rounded-lg p-4">
                    <p className="text-foreground/80 leading-relaxed text-sm">
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
                          className="px-3 py-2 border-2 border-primary text-primary font-semibold rounded-lg transition-all duration-300 hover:bg-primary hover:text-black capitalize text-xs"
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
                className="w-full px-6 py-2 bg-primary text-black font-bold rounded-lg transition-all duration-300 hover:scale-105 text-sm"
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
