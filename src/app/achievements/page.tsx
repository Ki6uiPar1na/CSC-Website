"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Image as ImageIcon, X, Calendar, Trophy, User, BarChart3, Check } from "lucide-react";

interface Achievement {
  id: number;
  competition_name: string;
  team_name: string;
  team_members: string;
  is_team_contest: boolean;
  position: number | null;
  prize_money: number | null;
  description: string;
  gallery_images: string | null;
  achievement_date: string;
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupedAchievements, setGroupedAchievements] = useState<Record<string, Achievement[]>>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  // Ensure hydration is complete before rendering
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/club-achievements");
        if (response.ok) {
          const data = await response.json();
          console.log("Fetched achievements:", data?.length || 0);

          // Ensure data is an array
          const achievementsArray = Array.isArray(data) ? data : [];
          setAchievements(achievementsArray);

          const grouped: Record<string, Achievement[]> = {};
          achievementsArray.forEach((achievement: Achievement) => {
            if (!grouped[achievement.competition_name]) {
              grouped[achievement.competition_name] = [];
            }
            grouped[achievement.competition_name].push(achievement);
          });
          setGroupedAchievements(grouped);
        } else {
          console.error("Failed to fetch, status:", response.status);
          setAchievements([]);
          setGroupedAchievements({});
        }
      } catch (error) {
        console.error("Failed to fetch achievements:", error);
        setAchievements([]);
        setGroupedAchievements({});
      } finally {
        setLoading(false);
      }
    };

    if (hydrated) {
      fetchAchievements();
    }
  }, [hydrated]);

  const years = Array.from(
    new Set(
      achievements.map((a) => new Date(a.achievement_date).getFullYear())
    )
  ).sort((a, b) => b - a);

  useEffect(() => {
    const filtered = achievements.filter((a) => {
      if (selectedYears.size === 0) return true;
      const year = new Date(a.achievement_date).getFullYear();
      return selectedYears.has(year);
    });

    const grouped: Record<string, Achievement[]> = {};
    filtered.forEach((achievement: Achievement) => {
      if (!grouped[achievement.competition_name]) {
        grouped[achievement.competition_name] = [];
      }
      grouped[achievement.competition_name].push(achievement);
    });
    setGroupedAchievements(grouped);
  }, [selectedYears, achievements]);

  const toggleYear = (year: number) => {
    const next = new Set(selectedYears);
    if (next.has(year)) {
      next.delete(year);
    } else {
      next.add(year);
    }
    setSelectedYears(next);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getPositionBadge = (position: number | null) => {
    if (!position) return null;
    const badges: Record<number, string> = {
      1: "🥇 1st",
      2: "🥈 2nd",
      3: "🥉 3rd",
    };
    return badges[position] || `${position}th`;
  };

  const parseTeamMembers = (membersString: string) => {
    return membersString
      .split(",")
      .map((member) => member.trim())
      .filter((member) => member.length > 0);
  };

  const selectedAchievement = selectedId
    ? achievements.find((a) => a.id === selectedId)
    : null;

  const yearFilter = (
    <div className="card sticky lg:top-24">
      <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">
        Filter by Year
      </p>
      <button
        type="button"
        onClick={() => setSelectedYears(new Set())}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium transition-all mb-1 ${
          selectedYears.size === 0
            ? "border-primary bg-primary/10 text-primary"
            : "border-border-color text-gray-400 hover:border-primary/40 hover:text-foreground"
        }`}
      >
        All Years
        {selectedYears.size === 0 && <Check size={14} />}
      </button>
      <div className="space-y-1">
        {years.map((year) => {
          const active = selectedYears.has(year);
          return (
            <button
              key={year}
              type="button"
              onClick={() => toggleYear(year)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border-color text-gray-400 hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {year}
              {active && <Check size={14} />}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="w-full">
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fadeInOverlay {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .modal-enter {
          animation: fadeIn 0.3s ease-out;
        }

        .overlay-enter {
          animation: fadeInOverlay 0.3s ease-out;
        }
      `}</style>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Year Filter Sidebar */}
        <aside className="lg:w-60 shrink-0">{yearFilter}</aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : Object.keys(groupedAchievements).length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg mb-6">
                {achievements.length === 0 ? "No achievements yet." : "No achievements found for the selected years."}
              </p>
              <Link href="/" className="inline-block px-6 py-2 border border-primary text-primary rounded-lg">
                Back to Home
              </Link>
            </div>
          ) : (
            <div className="space-y-12">
              {Object.entries(groupedAchievements)
                .sort(
                  ([, a], [, b]) =>
                    new Date(b[0].achievement_date).getTime() -
                    new Date(a[0].achievement_date).getTime()
                )
                .map(([contestName, items]) => {
                  const teamCount = items.filter(a => a.is_team_contest).length;
                  const soloCount = items.filter(a => !a.is_team_contest).length;

                  return (
                    <div key={contestName} className="space-y-4">
                      {/* Contest Header */}
                      <div className="border-b-2 border-primary/40 pb-3">
                        <h2 className="text-2xl font-bold text-primary mb-2">
                          {contestName}
                        </h2>
                        <div className="flex gap-6 text-sm text-foreground/70">
                          <span className="flex items-center gap-1.5"><Trophy size={14} className="text-accent" /> {teamCount} {teamCount === 1 ? "Team" : "Teams"}</span>
                          <span className="flex items-center gap-1.5"><User size={14} className="text-accent" /> {soloCount} {soloCount === 1 ? "Participant" : "Participants"}</span>
                          <span className="flex items-center gap-1.5"><BarChart3 size={14} className="text-accent" /> {items.length} Total</span>
                        </div>
                      </div>

                      {/* Participant/Team Cards Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {items
                          .sort((a, b) => {
                            if (a.position === null) return 1;
                            if (b.position === null) return -1;
                            return a.position - b.position;
                          })
                          .map((achievement) => (
                            <div
                              key={achievement.id}
                              onClick={() => setSelectedId(achievement.id)}
                              className="group cursor-pointer"
                            >
                              {/* Card */}
                              <div className="card hover:border-primary/60 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1">
                                {/* Team/Participant Name */}
                                <h3 className="text-sm font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors duration-300 break-words">
                                  {achievement.team_name}
                                </h3>

                                {/* Competition Badge & Date */}
                                <div className="flex items-center justify-between gap-2 mb-3">
                                  <p className="text-xs font-semibold text-accent truncate flex items-center gap-1">
                                    {achievement.is_team_contest ? <><Trophy size={12} /> Team</> : <><User size={12} /> Solo</>}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                    <Calendar size={10} className="text-primary" />
                                    {formatDate(achievement.achievement_date)}
                                  </div>
                                </div>

                                {/* Position & Prize */}
                                <div className="space-y-1 mb-3">
                                  {achievement.position && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">
                                        {getPositionBadge(achievement.position)}
                                      </span>
                                    </div>
                                  )}

                                  {achievement.prize_money && (
                                    <div className="text-xs font-bold text-accent">
                                      ৳{(achievement.prize_money / 1000).toFixed(0)}K Prize
                                    </div>
                                  )}
                                </div>

                                {/* View Details Button */}
                                <button className="w-full mt-2 px-3 py-1.5 border border-primary/50 text-primary text-xs font-semibold rounded-lg transition-all duration-300 hover:bg-primary hover:text-black group-hover:border-primary">
                                  View Details →
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Overlay */}
      {selectedAchievement && (
        <div
          className="overlay-enter fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4 top-16"
          onClick={() => setSelectedId(null)}
        >
          {/* Modal Content */}
          <div
            className="modal-enter bg-secondary/95 border border-primary/50 rounded-xl p-6 w-full max-w-2xl max-h-[calc(100vh-140px)] overflow-y-auto shadow-2xl shadow-primary/30 mt-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedId(null)}
              className="absolute top-4 right-4 text-foreground/60 hover:text-foreground transition-colors duration-200 text-xl"
            >
              ✕
            </button>

            {/* Modal Content */}
            <div className="space-y-4 pt-2">
              {/* Competition Title */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1 break-words">
                  {selectedAchievement.competition_name}
                </h2>
                <div className="w-8 h-0.5 bg-gradient-to-r from-primary to-transparent rounded-full"></div>
              </div>

              {/* Team/Participant Section */}
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 space-y-2">
                <p className="text-sm font-bold text-primary">
                  {selectedAchievement.is_team_contest ? "Team Members" : "Participant"}
                </p>
                <p className="text-lg font-bold text-foreground mb-2 break-words">
                  {selectedAchievement.team_name}
                </p>
                <div className="text-xs text-foreground/80 space-y-1">
                  {parseTeamMembers(selectedAchievement.team_members).map((member, idx) => (
                    <div key={idx} className="flex items-center gap-2 pl-2">
                      <span className="text-primary">•</span>
                      <span className="break-words">{member}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Achievement Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Position */}
                {selectedAchievement.position && (
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-center">
                    <p className="text-xs font-semibold text-gray-400 mb-1">Position</p>
                    <p className="text-lg font-bold text-primary">
                      {getPositionBadge(selectedAchievement.position)}
                    </p>
                  </div>
                )}

                {/* Prize Money */}
                {selectedAchievement.prize_money && (
                  <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 text-center">
                    <p className="text-xs font-semibold text-gray-400 mb-1">Prize Money</p>
                    <p className="text-lg font-bold text-accent">
                      ৳{selectedAchievement.prize_money.toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Date */}
                <div className="bg-primary/5 border border-primary/30 rounded-lg p-3 text-center">
                  <p className="text-xs font-semibold text-gray-400 mb-1">Date</p>
                  <p className="text-xs text-primary/80">
                    {formatDate(selectedAchievement.achievement_date)}
                  </p>
                </div>
              </div>

              {/* Description */}
              {selectedAchievement.description && (
                <div className="bg-secondary/50 border border-primary/30 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-400 mb-2">About</p>
                  <p className="text-xs text-foreground/80 leading-relaxed text-justify whitespace-pre-wrap break-all overflow-hidden">
                    {selectedAchievement.description}
                  </p>
                </div>
              )}

              {/* Gallery Section */}
              {selectedAchievement.gallery_images && (
                (() => {
                  try {
                    const images = typeof selectedAchievement.gallery_images === 'string'
                      ? JSON.parse(selectedAchievement.gallery_images)
                      : selectedAchievement.gallery_images;
                    return Array.isArray(images) && images.length > 0 ? (
                      <div className="bg-secondary/50 border border-primary/30 rounded-lg p-4">
                        <p className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                          <ImageIcon size={14} /> Gallery
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {images.map((img: string, idx: number) => (
                            <div
                              key={idx}
                              onClick={() => setSelectedImage(img)}
                              className="group relative aspect-square rounded-lg overflow-hidden border border-gray-700 hover:border-primary/30 transition-all cursor-zoom-in"
                            >
                              <img
                                src={img}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                alt={`Gallery ${idx + 1}`}
                                loading="lazy"
                                onError={(e) => {
                                  console.error("Image failed to load:", img);
                                }}
                              />
                              <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  } catch (err) {
                    console.error("Failed to parse gallery_images:", err, selectedAchievement.gallery_images);
                    return null;
                  }
                })()
              )}

              {/* Close Button */}
              <button
                onClick={() => setSelectedId(null)}
                className="w-full mt-4 px-4 py-2 bg-primary text-black font-bold text-sm rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X size={32} />
          </button>
          <div className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center">
            <img
              src={selectedImage}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl shadow-primary/20 animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* CTA Section */}
      {Object.keys(groupedAchievements).length > 0 && (
        <div className="mt-16">
          <div className="card border-dashed border-2 border-accent/30 bg-gradient-to-r from-accent/10 to-primary/10 py-12 px-8 rounded-xl text-center transition-all duration-300 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/20">
            <h3 className="text-2xl font-bold mb-3 transition-colors duration-300">
              Join Our Team
            </h3>
            <p className="text-gray-400 text-base mb-8 transition-all duration-300">
              Be part of the next achievement. Compete with us!
            </p>
            <button className="accent px-8 py-3 font-bold text-sm rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-accent/30">
              Join Competition Team
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
