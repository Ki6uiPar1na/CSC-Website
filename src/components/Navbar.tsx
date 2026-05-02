"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LogOut, User, Menu, X, Bell } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useNotifications } from "@/lib/NotificationContext";

export default function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { href: "/challenges", label: "Challenges", category: "main" },
    { href: "/leaderboard", label: "Leaderboard", category: "main" },
    { href: "/events", label: "Events", category: "main" },
    { href: "/achievements", label: "Achievements", category: "explore" },
    { href: "/gallery", label: "Gallery", category: "explore" },
    { href: "/resources", label: "Resources", category: "explore" },
    { href: "/about", label: "About", category: "about" },
    { href: "/executive", label: "Executive", category: "about" },
    { href: "/alumni", label: "Alumni", category: "about" },
    { href: "/contests", label: "Contests", category: "about" },
  ];

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
            onClick={() => setIsOpen(!isOpen)}
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

                <button
                  onClick={() => router.push("/profile")}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 hover:border-primary hover:bg-primary/10 transition-all text-sm font-medium"
                  title="Profile"
                >
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-black text-xs font-bold">
                    {session.user?.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="hidden sm:inline">{session.user?.name}</span>
                </button>

                <button
                  onClick={() => signOut()}
                  className="p-2 rounded-lg border border-error/40 hover:border-error hover:bg-error/10 transition-all text-error"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
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
