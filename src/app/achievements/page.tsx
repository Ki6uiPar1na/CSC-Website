"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";
import { Image as ImageIcon, X, Calendar } from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const response = await fetch("/api/club-achievements");
        if (response.ok) {
          const data = await response.json();
          setAchievements(data);

          const grouped: Record<string, Achievement[]> = {};
          data.forEach((achievement: Achievement) => {
            if (!grouped[achievement.competition_name]) {
              grouped[achievement.competition_name] = [];
            }
            grouped[achievement.competition_name].push(achievement);
          });
          setGroupedAchievements(grouped);
        }
      } catch (error) {
        console.error("Failed to fetch achievements:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  useEffect(() => {
    const filtered = achievements.filter((a) => {
      const query = searchQuery.toLowerCase();
      return (
        a.competition_name.toLowerCase().includes(query) ||
        (a.team_name && a.team_name.toLowerCase().includes(query)) ||
        (a.team_members && a.team_members.toLowerCase().includes(query)) ||
        (a.description && a.description.toLowerCase().includes(query)) ||
        (a.position && a.position.toString().includes(query))
      );
    });

    const grouped: Record<string, Achievement[]> = {};
    filtered.forEach((achievement: Achievement) => {
      if (!grouped[achievement.competition_name]) {
        grouped[achievement.competition_name] = [];
      }
      grouped[achievement.competition_name].push(achievement);
    });
    setGroupedAchievements(grouped);
  }, [searchQuery, achievements]);

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

  return (
    <div className="min-h-screen py-20 bg-black w-full">
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

      <div className="flex flex-col items-center justify-center w-full">
        {/* Header */}
        <div className="text-center mb-16 w-full px-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-3">
            Club Achievements
          </h1>
          <p className="text-gray-400 text-lg">Celebrating our victories</p>
        </div>

        {/* Search Bar */}
        <div className="w-full max-w-2xl px-4 mb-12">
          <SearchBox 
            query={searchQuery}
            setQuery={setSearchQuery}
            placeholder="Search competitions, teams, members, or achievements..."
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : Object.keys(groupedAchievements).length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-6">No achievements yet.</p>
            <Link href="/" className="inline-block px-6 py-2 border border-primary text-primary rounded-sm">
              Back to Home
            </Link>
          </div>
        ) : (
          <div className="w-full px-6 sm:px-12 lg:px-16 space-y-12 flex justify-center">
            <div className="w-full max-w-6xl space-y-12">
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
                    <div className="flex gap-6 text-xs text-foreground/60 uppercase tracking-widest">
                      <span>🏆 {teamCount} {teamCount === 1 ? "Team" : "Teams"}</span>
                      <span>👤 {soloCount} {soloCount === 1 ? "Participant" : "Participants"}</span>
                      <span>📊 {items.length} Total</span>
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
                        <div className="border border-primary/30 p-4 rounded-lg h-auto bg-gradient-to-br from-primary/5 to-transparent hover:border-primary/60 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:scale-105">
                          {/* Team/Participant Name */}
                          <h3 className="text-sm font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors duration-300 break-words">
                            {achievement.team_name}
                          </h3>

                          {/* Competition Badge & Date */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <p className="text-xs font-semibold text-accent truncate">
                              {achievement.is_team_contest ? "🏆 Team" : "👤 Solo"}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono">
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
                          <button className="w-full mt-2 px-3 py-1.5 border border-primary/50 text-primary text-xs font-semibold rounded-md transition-all duration-300 hover:bg-primary hover:text-black group-hover:border-primary">
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
          </div>
        )}

        {/* Modal Overlay */}
        {selectedAchievement && (
          <div
            className="overlay-enter fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4 top-16"
            onClick={() => setSelectedId(null)}
          >
            {/* Modal Content */}
            <div
              className="modal-enter bg-secondary/95 border border-primary/50 rounded-lg p-6 w-full max-w-2xl max-h-[calc(100vh-140px)] overflow-y-auto shadow-2xl shadow-primary/30 mt-8"
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
                  <p className="text-xs uppercase tracking-widest text-primary/70 font-bold">
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
                      <p className="text-xs uppercase text-primary/60 font-bold mb-1">Position</p>
                      <p className="text-lg font-bold text-primary">
                        {getPositionBadge(selectedAchievement.position)}
                      </p>
                    </div>
                  )}

                  {/* Prize Money */}
                  {selectedAchievement.prize_money && (
                    <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 text-center">
                      <p className="text-xs uppercase text-accent/60 font-bold mb-1">Prize Money</p>
                      <p className="text-lg font-bold text-accent">
                        ৳{selectedAchievement.prize_money.toLocaleString()}
                      </p>
                    </div>
                  )}

                  {/* Date */}
                  <div className="bg-primary/5 border border-primary/30 rounded-lg p-3 text-center">
                    <p className="text-xs uppercase text-primary/60 font-bold mb-1">Date</p>
                    <p className="text-xs font-mono text-primary/80">
                      {formatDate(selectedAchievement.achievement_date)}
                    </p>
                  </div>
                </div>



                {/* Description */}
                {selectedAchievement.description && (
                  <div className="bg-secondary/50 border border-primary/30 rounded-lg p-4">
                    <p className="text-xs uppercase text-primary/60 font-bold mb-2">About</p>
                    <p className="text-xs text-foreground/80 leading-relaxed text-justify whitespace-pre-wrap break-all overflow-hidden">
                      {selectedAchievement.description}
                    </p>
                  </div>
                )}

                {/* Gallery Section */}
                {selectedAchievement.gallery_images && JSON.parse(selectedAchievement.gallery_images).length > 0 && (
                  <div className="bg-secondary/50 border border-primary/30 rounded-lg p-4">
                    <p className="text-xs uppercase text-primary/60 font-bold mb-3 flex items-center gap-2">
                      <ImageIcon size={14} /> Gallery
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {JSON.parse(selectedAchievement.gallery_images).map((img: string, idx: number) => (
                        <div 
                          key={idx} 
                          onClick={() => setSelectedImage(img)}
                          className="group relative aspect-square rounded-lg overflow-hidden border border-gray-700 hover:border-primary/30 transition-all cursor-zoom-in"
                        >
                          <img src={img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                      ))}
                    </div>
                  </div>
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
          <div className="mt-24 w-screen px-6 sm:px-12 lg:px-16 mb-8">
            <div className="border-dashed border-2 border-accent/30 bg-gradient-to-r from-accent/10 to-primary/10 py-12 px-8 rounded-xl text-center transition-all duration-300 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/20">
              <h3 className="text-2xl font-bold mb-3 transition-colors duration-300">
                Join Our Team
              </h3>
              <p className="text-gray-400 text-base mb-8 transition-all duration-300">
                Be part of the next achievement. Compete with us!
              </p>
              <button className="accent px-8 py-3 font-bold uppercase tracking-widest text-sm rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-accent/30">
                Join Competition Team
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
