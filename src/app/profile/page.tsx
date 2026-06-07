"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Trophy, Flame, CheckCircle, Calendar, Shield, Info, Users } from "lucide-react";
import UpgradeModal from "@/components/UpgradeModal";
import PaymentModal from "@/components/PaymentModal";

interface Stats {
  solves: { solved_at: string; challenge_id: number }[];
  moduleStatus: { moduleId: number; title: string; isCompleted: boolean }[];
  totalScore: number;
  streak: number;
  isPremium: boolean;
  subscription_expires_at: string | null;
}

interface TeamInfo {
  id: number;
  name: string;
  description: string | null;
  members: { id: number; username: string; email: string }[];
  contests?: { id: number; name: string; description: string; event_date: string; details: string }[];
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number } | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ date: string; count: number } | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);

  useEffect(() => {
    if (status !== "loading" && !session) {
      router.push("/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session) {
      fetch("/api/user/stats")
        .then(res => res.json())
        .then(data => {
          setStats(data);
          setLoading(false);
        });
      fetch("/api/user/team")
        .then(res => res.json())
        .then(data => setTeamInfo(data.team || null))
        .catch(() => setTeamInfo(null));
    }
  }, [session]);

  if (status === "loading" || loading) return <div className="p-8 text-center text-primary font-mono animate-pulse">Initializing Profile...</div>;
  if (!session || !stats) return null;

  // Subscription Logic - Based on ACTIVE upgrade codes
  const isSubscribed = stats.isPremium === true;
  const neverSubscribed = !stats.isPremium;

  let membershipStatus = "Free Tier";
  let statusTextColor = "text-gray-500";
  if (isSubscribed) {
    membershipStatus = "Premium Member";
    statusTextColor = "text-accent";
  }

  // Generate heatmap data for last 90 days
  const today = new Date();
  const days = Array.from({ length: 91 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (90 - i));
    return d.toISOString().split('T')[0];
  });

  const solveMap = stats.solves.reduce((acc: any, solve) => {
    const d = new Date(solve.solved_at).toISOString().split('T')[0];
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});

  const activeDay = hoveredDay || selectedDay;

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4">
      {/* Header - Reduced Height and No Glow */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-8 text-center sm:text-left">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-black border border-primary text-primary rounded-full flex justify-center items-center text-xl sm:text-2xl font-bold shrink-0">
          {session.user?.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-grow w-full overflow-hidden">
          <h1 className="text-2xl sm:text-3xl font-bold truncate">{session.user?.name}</h1>
          <p className="mt-1 text-gray-500 font-mono text-xs sm:text-sm truncate">{session.user?.email}</p>
          <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
            <span className="badge-primary badge flex items-center gap-1.5 px-2 py-0.5">
              <Trophy size={12} /> {stats.totalScore} Points
            </span>
            <span className="badge-accent badge flex items-center gap-1.5 px-2 py-0.5">
              <Flame size={12} /> {stats.streak} Day Streak
            </span>
            {!neverSubscribed && (
              <span className={`badge flex items-center gap-1.5 px-2 py-0.5 ${isSubscribed ? 'badge-primary' : 'bg-error/10 text-error border border-error/20'}`}>
                <Shield size={12} /> {isSubscribed ? "PREMIUM" : "EXPIRED"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className={`card mb-6 border ${isSubscribed ? 'border-primary/30' : 'border-border-color'}`}>
        <h3 className="mb-4 flex items-center gap-2 text-base font-bold">
          <Shield size={18} className={isSubscribed ? "text-primary" : "text-gray-500"} /> 
          Membership Details
        </h3>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="w-full sm:w-auto">
            <p className="text-sm font-bold">
              Status: <span className={statusTextColor}>{membershipStatus}</span>
            </p>
            {!neverSubscribed && (
              <p className="mt-1 text-[10px] sm:text-xs text-gray-400 font-mono">
                {isSubscribed ? "You have an active premium code assigned" : "No active premium code"}
              </p>
            )}
            {neverSubscribed && (
              <p className="mt-1 text-[10px] sm:text-xs text-gray-400">Join premium for exclusive modules and challenges.</p>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {!isSubscribed && (
              <button 
                onClick={() => setIsPaymentModalOpen(true)}
                className="accent flex-1 sm:flex-none px-4 py-1.5 text-xs"
                title="Pay with bKash, Nagad, or Rocket"
              >
                Renew with Payment
              </button>
            )}
            <button 
              onClick={() => setIsUpgradeModalOpen(true)}
              className="primary flex-1 sm:flex-none px-4 py-1.5 text-xs"
            >
              {neverSubscribed ? "Use Code" : "Use Code"}
            </button>
          </div>
        </div>
      </div>

      {teamInfo && (
        <div className="card mb-6 border border-primary/20">
          <h3 className="mb-4 flex items-center gap-2 text-base font-bold">
            <Users size={18} className="text-primary" /> My Team
          </h3>
          <div className="mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-sm font-bold rounded-full border border-primary/30">
              <Users size={14} /> {teamInfo.name}
            </span>
            {teamInfo.description && (
              <p className="text-xs text-gray-400 mt-2">{teamInfo.description}</p>
            )}
          </div>
          <div className="space-y-2 mb-4">
            {teamInfo.members.map(m => (
              <div key={m.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-800/30">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-bold">
                  {m.username[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{m.username}</p>
                  <p className="text-xs text-gray-500">{m.email}</p>
                </div>
              </div>
            ))}
          </div>
          {teamInfo.contests && teamInfo.contests.length > 0 && (
            <>
              <div className="h-px bg-gray-800 mb-4" />
              <h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                <Trophy size={16} /> Past CTF Participations
              </h4>
              <div className="space-y-2">
                {teamInfo.contests.map(c => (
                  <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-800/20">
                    <div className="flex items-center gap-3 min-w-0">
                      <Trophy size={14} className="text-primary shrink-0" />
                      <span className="text-sm text-white truncate">{c.name}</span>
                    </div>
                    {c.event_date && (
                      <span className="text-[10px] text-gray-500 font-mono shrink-0 ml-2">
                        {new Date(c.event_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="flex items-center gap-2 text-base font-bold">
            <Calendar size={18} className="text-primary" /> Activity Heatmap
          </h3>
          {activeDay && (
            <div className="flex items-center gap-2 text-[10px] font-mono animate-in fade-in slide-in-from-right-2">
              <Info size={12} className="text-primary" />
              <span className="text-gray-400">{new Date(activeDay.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}:</span>
              <span className="text-primary font-bold">{activeDay.count} activity</span>
            </div>
          )}
        </div>
        
        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <div className="grid grid-cols-13 gap-1 min-w-[500px] bg-black/20 p-3 rounded border border-white/5">
            {days.map(day => {
              const count = solveMap[day] || 0;
              let bgColor = "bg-gray-800/20";
              let borderColor = "border-transparent";
              if (count > 0) { bgColor = "bg-primary/10"; borderColor = "border-primary/20"; }
              if (count > 2) { bgColor = "bg-primary/30"; borderColor = "border-primary/40"; }
              if (count > 5) { bgColor = "bg-primary/60"; borderColor = "border-primary/60"; }
              
              const isSelected = selectedDay?.date === day;
              
              return (
                <div 
                  key={day} 
                  title={`${day}: ${count} activity`}
                  className={`aspect-square rounded-sm border ${bgColor} ${borderColor} transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95 ${isSelected ? 'ring-1 ring-primary ring-offset-1 ring-offset-black scale-110 z-10' : ''}`}
                  onMouseEnter={() => setHoveredDay({ date: day, count })}
                  onMouseLeave={() => setHoveredDay(null)}
                  onClick={() => setSelectedDay(isSelected ? null : { date: day, count })}
                />
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-2 text-[8px] font-mono text-gray-500 uppercase tracking-tighter">
          <span>Less</span>
          <div className="w-2 h-2 bg-gray-800/20 border border-white/5 rounded-sm"></div>
          <div className="w-2 h-2 bg-primary/10 border border-primary/20 rounded-sm"></div>
          <div className="w-2 h-2 bg-primary/30 border border-primary/40 rounded-sm"></div>
          <div className="w-2 h-2 bg-primary/60 border border-primary/60 rounded-sm"></div>
          <span>More</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="card h-fit">
          <h3 className="mb-4 flex items-center gap-2 text-base font-bold">
            <CheckCircle size={18} className="text-accent" /> Completed Modules
          </h3>
          <ul className="space-y-3">
            {stats.moduleStatus.length > 0 ? stats.moduleStatus.map(mod => (
              <li key={mod.moduleId} className="flex justify-between items-center py-1.5 border-b border-border-color/30 last:border-0">
                <span className={`text-xs ${mod.isCompleted ? "text-foreground font-medium" : "text-gray-500"}`}>{mod.title}</span>
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${mod.isCompleted ? "bg-accent/10 text-accent border border-accent/20" : "bg-gray-800 text-gray-600"}`}>
                  {mod.isCompleted ? "COMPLETED" : "IN PROGRESS"}
                </span>
              </li>
            )) : <p className="text-xs text-gray-500 italic font-mono">No modules started.</p>}
          </ul>
        </div>

        <div className="card h-fit">
          <h3 className="text-base mb-4 font-bold">Recent Solves</h3>
          {stats.solves.length > 0 ? (
            <ul className="space-y-3">
              {stats.solves.slice(0, 5).map((solve, i) => (
                <li key={i} className="py-1.5 border-b border-border-color/30 last:border-0 text-xs text-gray-400 font-mono">
                  Flag captured: <span className="text-primary">{new Date(solve.solved_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-500 italic font-mono">No solves detected.</p>
          )}
        </div>
      </div>
      
      <UpgradeModal 
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onSuccess={() => {
          // Refresh stats after successful upgrade
          fetch("/api/user/stats")
            .then(res => res.json())
            .then(data => setStats(data));
        }}
      />
      
      <PaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => {
          // Refresh stats after successful payment
          fetch("/api/user/stats")
            .then(res => res.json())
            .then(data => setStats(data));
        }}
      />
      
      <style jsx>{`
        .grid-cols-13 {
          grid-template-columns: repeat(13, minmax(0, 1fr));
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--primary);
          opacity: 0.5;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
