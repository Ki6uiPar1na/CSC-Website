"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Users, Zap, BookMarked, Lock, Calendar, CreditCard, Bell, Settings, Loader2, ArrowRight, Award, Users2, Trophy } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminPageHeader";

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

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const userRole = session?.user ? (session.user as any).role : null;

  useEffect(() => {
    if (userRole) {
      fetchStats();
    }
  }, [userRole]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const isInstructor = userRole === 2;
      
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
      title: "Events",
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

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        icon={<span>📊</span>}
      />

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
        </div>
      )}
    </div>
  );
}
