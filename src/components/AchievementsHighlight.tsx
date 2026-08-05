"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Trophy, Users, Award } from "lucide-react";

interface Achievement {
  id: number;
  competition_name: string;
  contest_name: string;
  team_name: string;
  team_members: string;
  is_team_contest: boolean;
  position: number | null;
  prize_money: number | null;
  description: string;
  gallery_images: string | null;
  achievement_date: string;
}

export default function AchievementsHighlight() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const fetchAchievements = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/club-achievements");
        if (response.ok) {
          const data = await response.json();
          const arr = Array.isArray(data) ? data : [];
          setAchievements(arr);
        } else {
          setAchievements([]);
        }
      } catch (error) {
        console.error("Failed to fetch achievements:", error);
        setAchievements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, [hydrated]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
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

  const parseGalleryImages = (galleryImages: string | null): string[] => {
    if (!galleryImages) return [];
    try {
      const parsed = JSON.parse(galleryImages);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  };

  const displayAchievements = achievements.slice(0, 6);

  return (
    <div className="mt-8 w-full">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4">
          <Trophy size={14} /> Victories
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
          Club <span className="text-primary">Achievements</span>
        </h2>
        <p className="text-gray-400 text-sm sm:text-base">
          Celebrating our victories
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : displayAchievements.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No achievements yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {displayAchievements.map((achievement) => {
            const galleryImages = parseGalleryImages(achievement.gallery_images);
            const coverImage = galleryImages[0];

            return (
            <div
              key={achievement.id}
              className="card text-left overflow-hidden hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300"
            >
              {coverImage && (
                <div className="relative -mx-3 -mt-3 sm:-mx-6 sm:-mt-6 mb-3 aspect-[16/9] overflow-hidden rounded-t-sm bg-secondary">
                  <img
                    src={coverImage}
                    alt={achievement.competition_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  {galleryImages.length > 1 && (
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm border border-primary/30 text-primary text-[10px] font-mono font-bold rounded-sm">
                      +{galleryImages.length - 1} photos
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="text-sm sm:text-base font-bold text-primary leading-snug line-clamp-2 break-words">
                  {achievement.competition_name}
                </h3>
                <span className="text-lg shrink-0">
                  {achievement.position
                    ? getPositionBadge(achievement.position)
                    : achievement.is_team_contest
                    ? "🏆"
                    : "⭐"}
                </span>
              </div>

              {achievement.contest_name && (
                <p className="text-xs text-gray-400 mb-2 line-clamp-1">
                  {achievement.contest_name}
                </p>
              )}

              <div className="flex items-center gap-1.5 text-[11px] text-foreground/70 mb-2">
                <Users size={12} className="text-accent" />
                <span className="line-clamp-1">
                  {achievement.team_name || "Individual"}
                </span>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-color">
                {achievement.prize_money ? (
                  <span className="text-xs font-bold text-accent flex items-center gap-1">
                    <Award size={12} />
                    ৳{achievement.prize_money.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-xs text-gray-500">
                    {achievement.is_team_contest ? "Team" : "Solo"}
                  </span>
                )}
                {achievement.achievement_date && (
                  <span className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono">
                    <Calendar size={10} className="text-primary" />
                    {formatDate(achievement.achievement_date)}
                  </span>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {!loading && displayAchievements.length > 0 && (
        <div className="text-center mt-10">
          <Link href="/achievements">
            <button>View All Achievements</button>
          </Link>
        </div>
      )}
    </div>
  );
}
