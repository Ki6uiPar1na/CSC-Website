"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  KeyRound,
  BookOpen,
  Zap,
  Users,
  Calendar,
  CreditCard,
  Bell,
  Settings,
  BookMarked,
  Menu,
  X,
  Trophy,
  Briefcase,
  GraduationCap,
  Award,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: number[]; // Roles that can see this item. If omitted, all admin roles can see it.
}

const navItems: NavItem[] = [
  { label: "Upgrade Codes", href: "/admin/upgrade-codes", icon: <KeyRound size={18} />, roles: [1] },
  { label: "Modules", href: "/admin/modules", icon: <BookOpen size={18} /> },
  { label: "Challenges", href: "/admin/challenges", icon: <Zap size={18} /> },
  { label: "Resources", href: "/admin/resources", icon: <BookMarked size={18} /> },
  { label: "Users", href: "/admin/users", icon: <Users size={18} />, roles: [1] },
  { label: "Events", href: "/admin/events", icon: <Calendar size={18} /> },
  { label: "Payment Requests", href: "/admin/payment-requests", icon: <CreditCard size={18} />, roles: [1] },
  { label: "Notifications", href: "/admin/notifications", icon: <Bell size={18} /> },
  { label: "Executives", href: "/admin/executives", icon: <Briefcase size={18} />, roles: [1] },
  { label: "Contests", href: "/admin/contests", icon: <Trophy size={18} />, roles: [1] },
  { label: "Achievements", href: "/admin/achievements", icon: <Award size={18} /> },
  { label: "Alumni", href: "/admin/alumni", icon: <GraduationCap size={18} />, roles: [1] },
  { label: "Settings", href: "/admin/settings", icon: <Settings size={18} />, roles: [1] },
];

export const AdminSidebar = () => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  const userRole = session?.user ? (session.user as any).role : null;

  const filteredItems = navItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-20 left-4 z-50 p-2 bg-gray-800 text-white rounded-lg shadow-lg border border-gray-700"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-gray-900 border-r border-gray-800 flex flex-col transform transition-transform duration-200 z-40 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <Link href="/admin" className="text-xl font-bold text-primary">
            {userRole === 1 ? "Admin Panel" : "Instructor Panel"}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto pb-4">
          <ul className="space-y-2 p-4">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? "bg-primary text-background font-semibold"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
