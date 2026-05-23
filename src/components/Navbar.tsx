"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LogOut, User, Menu, X, Bell, ChevronDown, Users, Trophy } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useNotifications } from "@/lib/NotificationContext";

interface TeamInfo {
  id: number;
  name: string;
  description: string | null;
  members: { id: number; username: string; email: string }[];
  contests?: { id: number; name: string; description: string; event_date: string; details: string }[];
}

export default function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fetchTeamInfo = async () => {
    if (!session) {
      setTeamInfo(null);
      return;
    }
    try {
      const res = await fetch("/api/user/team");
      const data = await res.json();
      setTeamInfo(data.team || null);
    } catch {
      setTeamInfo(null);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allNavItems = [
    { href: "/challenges", label: "Challenges", category: "main", requiresAuth: true },
    { href: "/leaderboard", label: "Leaderboard", category: "main", requiresAuth: true },
    { href: "/events", label: "Events", category: "main" },
    { href: "/achievements", label: "Achievements", category: "explore" },
    { href: "/gallery", label: "Gallery", category: "explore" },
    { href: "/resources", label: "Resources", category: "explore", requiresAuth: true },
    { href: "/about", label: "About", category: "about" },
    { href: "/executive", label: "Executive", category: "about" },
    { href: "/alumni", label: "Alumni", category: "about" },
    { href: "/contests", label: "Contests", category: "about" },
  ];

  const navItems = allNavItems.filter(item => !item.requiresAuth || session);

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black/90 backdrop-blur-md border-b border-white/10 py-3' : 'bg-transparent py-4'}`}>
      <div className="w-full">
        {/* Top Bar: Logo + User Menu */}
        <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-4 lg:mb-0">
          <Link href="/" className="logo shrink-0 no-underline font-bold text-2xl flex items-center gap-3">
            <img src="/logo.png" alt="JKKNIU-CSC" className="w-10 h-10 object-contain" />
            <span className="hidden sm:inline">JKKNIU-CSC</span>
            <span className="sm:hidden">CSC</span>
          </Link>

          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden text-primary focus:outline-none p-1 z-50" 
            onClick={() => {
              if (!isOpen) fetchTeamInfo();
              setIsOpen(!isOpen);
            }}
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>

          {/* Desktop User Controls */}
          <div className="hidden lg:flex items-center gap-3">
            {session ? (
              <>
                <Link
                  href="/notifications"
                  className="relative p-2 rounded-lg border border-primary/40 hover:border-primary hover:bg-primary/10 transition-all"
                  title="Notifications"
                >
                  <Bell size={20} className="text-primary" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>

                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => {
                      if (!profileDropdown) fetchTeamInfo();
                      setProfileDropdown(!profileDropdown);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 hover:border-primary hover:bg-primary/10 transition-all text-sm font-medium"
                    title="Profile"
                  >
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-black text-xs font-bold">
                      {session.user?.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="hidden sm:inline">{session.user?.name}</span>
                    <ChevronDown size={14} className={`hidden sm:block transition-transform ${profileDropdown ? "rotate-180" : ""}`} />
                  </button>

                  {profileDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in slide-in-from-top-2 duration-200 z-50">
                      <div className="p-4 border-b border-gray-800">
                        <p className="text-sm font-bold text-white truncate">{session.user?.name}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{session.user?.email}</p>
                      </div>

                      {teamInfo && (
                        <div className="px-4 py-3 border-b border-gray-800">
                          <div className="flex items-center gap-2 mb-2">
                            <Users size={14} className="text-primary" />
                            <Link href="/profile/team" className="text-xs font-bold text-primary uppercase tracking-wider hover:underline" onClick={() => setProfileDropdown(false)}>{teamInfo.name}</Link>
                          </div>
                          <div className="space-y-1 mb-3">
                            {teamInfo.members.map(m => (
                              <div key={m.id} className="flex items-center gap-2 text-xs text-gray-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                                <span>{m.username}</span>
                              </div>
                            ))}
                          </div>
                          {teamInfo.contests && teamInfo.contests.length > 0 && (
                            <>
                              <div className="h-px bg-gray-800 mb-2" />
                              <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1.5">Past CTF Participations</p>
                              <div className="space-y-1">
                                {teamInfo.contests.map(c => (
                                  <div key={c.id} className="flex items-center gap-2 text-xs text-gray-400">
                                    <Trophy size={10} className="text-primary shrink-0" />
                                    <span className="truncate">{c.name}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      <div className="p-2">
                        <button
                          onClick={() => { router.push("/profile"); setProfileDropdown(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-all text-sm"
                        >
                          <User size={16} />
                          <span>View Profile</span>
                        </button>
                        <button
                          onClick={() => signOut()}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-error transition-all text-sm"
                        >
                          <LogOut size={16} />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="px-6 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-all uppercase text-sm"
              >
                Login
              </Link>
            )}
          </div>
        </div>

        {/* Desktop Navigation - Centered */}
        <nav className="hidden lg:flex justify-center gap-2 items-center flex-wrap px-4 sm:px-6 lg:px-8">
          {/* Main Platform Section */}
          <div className="flex gap-2">
            {navItems
              .filter(item => item.category === "main")
              .map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-lg border transition-all text-sm font-semibold uppercase tracking-wide ${
                      active 
                        ? "bg-primary text-black border-primary shadow-lg shadow-primary/20" 
                        : "border-primary/50 text-foreground hover:text-primary hover:bg-primary/10"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-primary/30" />

          {/* Explore Section */}
          <div className="flex gap-2">
            {navItems
              .filter(item => item.category === "explore")
              .map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium uppercase tracking-wide ${
                      active
                        ? "bg-primary text-black border-primary shadow-lg shadow-primary/20"
                        : "border-primary/30 text-foreground/80 hover:text-foreground hover:bg-primary/5"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-primary/30" />

          {/* About & Community Section */}
          <div className="flex gap-2">
            {navItems
              .filter(item => item.category === "about")
              .map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium uppercase tracking-wide ${
                      active
                        ? "bg-primary text-black border-primary shadow-lg shadow-primary/20"
                        : "border-primary/20 text-foreground/70 hover:text-foreground hover:bg-primary/5"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
          </div>
        </nav>
      </div>

      {/* Mobile Navigation Menu */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 top-16 z-40 bg-black/95 backdrop-blur-md overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
            {/* Main Section */}
            <div>
              <p className="text-xs uppercase tracking-widest text-primary/70 font-bold px-2 mb-3">Platform</p>
              <div className="space-y-2">
                {navItems
                  .filter(item => item.category === "main")
                  .map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center px-4 py-3 rounded-lg border transition-all font-semibold uppercase tracking-wide ${
                          active
                            ? "bg-primary text-black border-primary"
                            : "border-primary/50 text-foreground hover:border-primary hover:bg-primary/10"
                        }`}
                        onClick={() => setIsOpen(false)}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
              </div>
            </div>

            <div className="h-px bg-primary/20" />

            {/* Explore Section */}
            <div>
              <p className="text-xs uppercase tracking-widest text-primary/70 font-bold px-2 mb-3">Explore</p>
              <div className="space-y-2">
                {navItems
                  .filter(item => item.category === "explore")
                  .map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center px-4 py-3 rounded-lg border transition-all font-medium uppercase tracking-wide ${
                          active
                            ? "bg-primary text-black border-primary"
                            : "border-primary/30 text-foreground/80 hover:border-primary hover:bg-primary/5"
                        }`}
                        onClick={() => setIsOpen(false)}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
              </div>
            </div>

            <div className="h-px bg-primary/20" />

            {/* About & Community Section */}
            <div>
              <p className="text-xs uppercase tracking-widest text-primary/70 font-bold px-2 mb-3">About & Community</p>
              <div className="space-y-2">
                {navItems
                  .filter(item => item.category === "about")
                  .map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center px-4 py-3 rounded-lg border transition-all font-medium uppercase tracking-wide ${
                          active
                            ? "bg-primary text-black border-primary"
                            : "border-primary/20 text-foreground/70 hover:border-primary hover:bg-primary/5"
                        }`}
                        onClick={() => setIsOpen(false)}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
              </div>
            </div>

            <div className="h-px bg-primary/20" />

            {/* Account Section */}
            {session ? (
              <div>
                <p className="text-xs uppercase tracking-widest text-primary/70 font-bold px-2 mb-3">Account</p>
                <div className="space-y-2">
                  <Link
                    href="/notifications"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg border border-primary/40 hover:border-primary hover:bg-primary/10 transition-all text-foreground font-semibold uppercase tracking-wide"
                    onClick={() => setIsOpen(false)}
                  >
                    <Bell size={18} className="text-primary" />
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                        {unreadCount}
                      </span>
                    )}
                  </Link>

                  <button
                    onClick={() => {
                      router.push("/profile");
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-primary/40 hover:border-primary hover:bg-primary/10 transition-all text-foreground font-semibold uppercase tracking-wide"
                  >
                    <User size={18} className="text-primary" />
                    <span>{session.user?.name}</span>
                  </button>

                  {teamInfo && (
                    <div className="px-4 py-3 rounded-lg border border-primary/20 bg-primary/5">
                      <div className="flex items-center gap-2 mb-2">
                        <Users size={14} className="text-primary" />
                        <Link href="/profile/team" className="text-xs font-bold text-primary uppercase tracking-wider hover:underline" onClick={() => setIsOpen(false)}>{teamInfo.name}</Link>
                      </div>
                      <div className="space-y-1.5 mb-3">
                        {teamInfo.members.map(m => (
                          <div key={m.id} className="flex items-center gap-2 text-xs text-gray-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                            <span>{m.username}</span>
                          </div>
                        ))}
                      </div>
                      {teamInfo.contests && teamInfo.contests.length > 0 && (
                        <>
                          <div className="h-px bg-primary/10 mb-2" />
                          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1.5">Past CTF Participations</p>
                          <div className="space-y-1.5">
                            {teamInfo.contests.map(c => (
                              <div key={c.id} className="flex items-center gap-2 text-xs text-gray-400">
                                <Trophy size={10} className="text-primary shrink-0" />
                                <span className="truncate">{c.name}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      signOut();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-error/40 hover:border-error hover:bg-error/10 transition-all text-error font-semibold uppercase tracking-wide"
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center justify-center px-4 py-3 rounded-lg bg-primary text-black font-bold uppercase tracking-wide hover:bg-primary/90 transition-all"
                onClick={() => setIsOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
