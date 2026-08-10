"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Users, Zap, BookMarked, Lock, Calendar, CreditCard, Bell, Settings,
  Loader2, ArrowRight, Award, Users2, Trophy, Sparkles, FileText, GitPullRequest,
  ShieldCheck, Activity,
} from "lucide-react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { formatDate } from "@/lib/admin-utils";

interface DashboardStats {
  totalUsers?: number;
  totalChallenges: number;
  totalResources: number;
  totalEvents: number;
  premiumUsers?: number;
  activeCodes?: number;
  pendingPayments?: number;
  totalExecutives?: number;
  totalContests?: number;
  totalAlumni?: number;
  totalAchievements?: number;
}

interface ActivityItem {
  id: number;
  title: string;
  meta: string;
  href: string;
  type: string;
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const user = session?.user as any;
  const userRole = user?.role ?? null;
  const isInstructor = userRole === 2;

  useEffect(() => {
    if (userRole) {
      fetchStats();
      fetchActivity();
    }
  }, [userRole]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const endpoints = [
        fetch("/api/admin/challenges"),
        fetch("/api/admin/resources"),
        fetch("/api/admin/events"),
        fetch("/api/admin/executives"),
        fetch("/api/admin/contests"),
        fetch("/api/admin/alumni"),
        fetch("/api/admin/achievements"),
      ];

      if (!isInstructor) {
        endpoints.push(fetch("/api/admin/users?page=1&limit=1"));
        endpoints.push(fetch("/api/admin/upgrade-codes"));
        endpoints.push(fetch("/api/admin/payment-requests"));
      }

      const results = await Promise.all(endpoints);

      const challengesData = await results[0].json();
      const resourcesData = await results[1].json();
      const eventsData = await results[2].json();
      const executivesData = await results[3].json();
      const contestsData = await results[4].json();
      const alumniData = await results[5].json();
      const achievementsData = await results[6].json();

      let statsObj: DashboardStats = {
        totalChallenges: challengesData.challenges?.length || 0,
        totalResources: resourcesData.resources?.length || 0,
        totalEvents: eventsData.events?.length || 0,
        totalExecutives: executivesData.executives?.length || 0,
        totalContests: contestsData.contests?.length || 0,
        totalAlumni: alumniData.alumni?.length || 0,
        totalAchievements: achievementsData.achievements?.length || 0,
      };

      if (!isInstructor) {
        const usersData = await results[7].json();
        const upgradeData = await results[8].json();
        const paymentData = await results[9].json();

        statsObj.totalUsers = usersData.pagination?.totalCount || 0;
        statsObj.premiumUsers = usersData.users?.filter((u: any) => u.is_premium).length || 0;
        statsObj.activeCodes = upgradeData.stats?.unused || 0;
        statsObj.pendingPayments = paymentData.requests?.filter((r: any) => r.status === "pending").length || 0;
      }

      setStats(statsObj);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivity = async () => {
    try {
      const [eventsRes, paymentsRes, usersRes, notificationsRes] = await Promise.allSettled([
        fetch("/api/admin/events?page=1&limit=3"),
        fetch("/api/admin/payment-requests?page=1&limit=5"),
        fetch(`/api/admin/users?page=1&limit=5${isInstructor ? "&role=3" : ""}`),
        fetch("/api/admin/notifications?page=1&limit=3"),
      ]);

      const items: ActivityItem[] = [];

      if (eventsRes.status === "fulfilled") {
        const data = await eventsRes.value.json();
        (data.events || []).forEach((e: any) => {
          items.push({ id: e.id, title: e.title, meta: `Event · ${formatDate(e.event_date)}`, href: "/admin/events", type: "event" });
        });
      }

      if (!isInstructor && paymentsRes.status === "fulfilled") {
        const data = await paymentsRes.value.json();
        (data.requests || []).filter((r: any) => r.status === "pending").slice(0, 5).forEach((r: any) => {
          items.push({ id: r.id, title: `Payment from ${r.username}`, meta: `৳${r.amount} · ${r.plan}`, href: "/admin/payment-requests", type: "payment" });
        });
      }

      if (!isInstructor && usersRes.status === "fulfilled") {
        const data = await usersRes.value.json();
        (data.users || []).slice(0, 3).forEach((u: any) => {
          items.push({ id: u.id, title: u.username, meta: `Joined ${formatDate(u.created_at)}`, href: "/admin/users", type: "user" });
        });
      }

      if (notificationsRes.status === "fulfilled") {
        const data = await notificationsRes.value.json();
        (data.notifications || []).slice(0, 3).forEach((n: any) => {
          items.push({ id: n.id, title: n.title, meta: `Notification`, href: "/admin/notifications", type: "notification" });
        });
      }

      setActivity(items.slice(0, 8));
    } catch (error) {
      console.error("Failed to fetch activity:", error);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const quickActions = [
    { label: "New Event", href: "/admin/events", icon: <Calendar size={16} /> },
    { label: "New Challenge", href: "/admin/challenges", icon: <Zap size={16} /> },
    { label: "Send Notification", href: "/admin/notifications", icon: <Bell size={16} /> },
    { label: "New Module", href: "/admin/modules", icon: <BookMarked size={16} /> },
  ];

  if (!isInstructor) {
    quickActions.push(
      { label: "Approve Payments", href: "/admin/payment-requests", icon: <CreditCard size={16} /> },
      { label: "Generate Codes", href: "/admin/upgrade-codes", icon: <GitPullRequest size={16} /> }
    );
  }

  const allDashboardCards = [
    {
      title: "Users",
      count: stats?.totalUsers || 0,
      icon: <Users size={24} />,
      href: "/admin/users",
      color: "from-blue-500 to-blue-600",
      roles: [1],
    },
    {
      title: "Premium Users",
      count: stats?.premiumUsers || 0,
      icon: <Lock size={24} />,
      href: "/admin/users",
      color: "from-yellow-500 to-yellow-600",
      roles: [1],
    },
    {
      title: "Challenges",
      count: stats?.totalChallenges || 0,
      icon: <Zap size={24} />,
      href: "/admin/challenges",
      color: "from-pink-500 to-pink-600",
    },
    {
      title: "Resources",
      count: stats?.totalResources || 0,
      icon: <BookMarked size={24} />,
      href: "/admin/resources",
      color: "from-green-500 to-green-600",
    },
    {
      title: "Events & News Update",
      count: stats?.totalEvents || 0,
      icon: <Calendar size={24} />,
      href: "/admin/events",
      color: "from-indigo-500 to-indigo-600",
    },
    {
      title: "Active Codes",
      count: stats?.activeCodes || 0,
      icon: <CreditCard size={24} />,
      href: "/admin/upgrade-codes",
      color: "from-orange-500 to-orange-600",
      roles: [1],
    },
    {
      title: "Executives",
      count: stats?.totalExecutives || 0,
      icon: <Users2 size={24} />,
      href: "/admin/executives",
      color: "from-cyan-500 to-cyan-600",
      roles: [1],
    },
    {
      title: "Contests",
      count: stats?.totalContests || 0,
      icon: <Trophy size={24} />,
      href: "/admin/contests",
      color: "from-amber-500 to-amber-600",
      roles: [1],
    },
    {
      title: "Alumni",
      count: stats?.totalAlumni || 0,
      icon: <Award size={24} />,
      href: "/admin/alumni",
      color: "from-teal-500 to-teal-600",
      roles: [1],
    },
    {
      title: "Achievements",
      count: stats?.totalAchievements || 0,
      icon: <Trophy size={24} />,
      href: "/admin/achievements",
      color: "from-emerald-500 to-emerald-600",
      roles: [1, 2],
    },
    {
      title: "Pending Payments",
      count: stats?.pendingPayments || 0,
      icon: <CreditCard size={24} />,
      href: "/admin/payment-requests",
      color: "from-red-500 to-red-600",
      roles: [1],
    },
  ];

  const dashboardCards = allDashboardCards.filter(card => {
    if (!card.roles) return true;
    return card.roles.includes(userRole as number);
  });

  const typeStyles: Record<string, string> = {
    event: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    payment: "bg-red-500/10 text-red-400 border-red-500/20",
    user: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    notification: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="card relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-400">{today}</p>
            <h1 className="text-2xl font-bold text-white mt-1">
              {greeting()}, {user?.name || "Admin"} <span className="inline-block">👋</span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Here&apos;s what&apos;s happening across the club today.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-primary/30 bg-primary/10 text-primary">
              <ShieldCheck size={14} />
              {isInstructor ? "Instructor" : "Super Admin"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-gray-700 bg-gray-800 text-gray-300">
              <Sparkles size={14} />
              Administrator
            </span>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800/80 border border-gray-700 text-sm font-semibold text-gray-200 hover:border-primary/50 hover:text-white transition-all"
          >
            <span className="text-primary">{action.icon}</span>
            {action.label}
          </Link>
        ))}
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800/80 border border-gray-700 text-sm font-semibold text-gray-200 hover:border-primary/50 hover:text-white transition-all"
        >
          <Settings size={16} className="text-primary" />
          Settings
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      ) : (
        <div>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {dashboardCards.map((card) => (
              <Link key={card.title} href={card.href}>
                <div className={`card hover:shadow-lg hover:shadow-primary/50 transition-all cursor-pointer group bg-gradient-to-br ${card.color}/10 border border-gray-700 hover:border-primary/50`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${card.color} text-white group-hover:scale-110 transition-transform`}>
                      {card.icon}
                    </div>
                    <ArrowRight size={16} className="text-gray-500 group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-gray-400 text-sm">{card.title}</p>
                  <p className="text-3xl font-bold text-white mt-1">{card.count}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Recent activity */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Activity size={18} className="text-primary" />
                Recent Activity
              </h3>
              {activity.length > 0 && (
                <span className="text-xs text-gray-500">{activity.length} latest updates</span>
              )}
            </div>

            {activity.length === 0 ? (
              <div className="text-center py-10">
                <FileText size={32} className="mx-auto text-gray-700 mb-2" />
                <p className="text-gray-500 text-sm">No recent activity yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {activity.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={item.href}
                    className="flex items-center gap-4 py-3 hover:bg-gray-800/30 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <span className={`shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center ${typeStyles[item.type] || "bg-gray-800 text-gray-400 border-gray-700"}`}>
                      {item.type === "event" ? <Calendar size={18} /> :
                       item.type === "payment" ? <CreditCard size={18} /> :
                       item.type === "user" ? <Users size={18} /> : <Bell size={18} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.meta}</p>
                    </div>
                    <ArrowRight size={14} className="text-gray-600 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
