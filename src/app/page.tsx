import Link from "next/link";
import {
  Shield,
  Zap,
  Flame,
  Layers,
  Compass,
  Users,
  GraduationCap,
  Calendar,
  Trophy,
  Star,
  BarChart3,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import AchievementsHighlight from "@/components/AchievementsHighlight";

const features = [
  {
    icon: Zap,
    title: "Dynamic Scoring",
    description: "Challenges lose value as more people solve them. Speed is key to staying on top.",
    iconColor: "text-primary",
    iconBg: "bg-primary/10 border-primary/20",
  },
  {
    icon: Flame,
    title: "Streak Bonus",
    description: "Stay consistent. Maintain your daily login streak to earn significant point multipliers.",
    iconColor: "text-accent",
    iconBg: "bg-accent/10 border-accent/20",
  },
  {
    icon: Layers,
    title: "Module Mastery",
    description: "Complete entire challenge categories to unlock massive completion bonuses.",
    iconColor: "text-primary",
    iconBg: "bg-primary/10 border-primary/20",
  },
];

const quickLinks = [
  { href: "/executive", icon: Users, label: "Executive", desc: "Meet our team" },
  { href: "/alumni", icon: GraduationCap, label: "Alumni", desc: "Past members" },
  { href: "/events", icon: Calendar, label: "Events & News", desc: "What's happening" },
  { href: "/contests", icon: Trophy, label: "Contests", desc: "CTF competitions" },
  { href: "/achievements", icon: Star, label: "Achievements", desc: "Our victories" },
  { href: "/leaderboard", icon: BarChart3, label: "Leaderboard", desc: "Top hackers" },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      <section className="flex flex-col items-center text-center pt-8 md:pt-14 pb-16 md:pb-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary mb-6">
          <Shield size={14} />
          Official Platform &middot; JKKNIU Cyber Security Club
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tighter leading-none px-4">
          <span className="text-gradient">JKKNIU-CSC</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl md:text-2xl text-foreground font-medium px-4">
          Jatiya Kabi Kazi Nazrul Islam University
        </p>
        <p className="mt-1 text-sm sm:text-base text-gray-400 font-semibold px-4">
          Cyber Security Club &middot; Learn, Practice &amp; Compete
        </p>

        <p className="mt-6 max-w-2xl text-sm sm:text-base text-gray-500 leading-relaxed px-4">
          Join a community of cybersecurity enthusiasts. Solve hands-on challenges,
          master structured learning modules, and climb the leaderboard one flag at a time.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4 w-full max-w-lg px-4">
          <Link href="/challenges" className="flex-1">
            <button className="btn-primary w-full py-3.5 text-base">
              Launch Platform
              <ArrowRight size={18} />
            </button>
          </Link>
          <Link href="/about" className="flex-1">
            <button className="accent w-full py-3.5 text-base">Our Club</button>
          </Link>
        </div>
      </section>

      <section className="w-full py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {features.map((f) => (
            <div key={f.title} className="card group text-left">
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-xl border ${f.iconBg} ${f.iconColor} mb-4 group-hover:scale-110 transition-transform duration-300`}
              >
                <f.icon size={24} />
              </div>
              <h3 className="text-lg font-bold mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="w-full py-10">
        <AchievementsHighlight />
      </section>

      <section className="w-full py-6">
        <div className="text-center mb-10">
          <span className="section-badge">
            <Compass size={14} />
            Explore
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl font-bold">Everything at your fingertips</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {quickLinks.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="card group hover:border-primary/50 transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0 group-hover:scale-105 transition-transform">
                  <q.icon size={18} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">{q.label}</p>
                  <p className="text-xs text-gray-500">{q.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="w-full py-10 pb-16">
        <div className="card relative overflow-hidden text-center px-6 py-12 sm:py-16">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
          <div className="relative">
            <Sparkles size={28} className="text-primary mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Ready to join our community?</h2>
            <p className="text-gray-400 text-sm sm:text-base mb-8 max-w-md mx-auto">
              Create your account and start your cybersecurity journey today.
            </p>
            <Link href="/register" className="inline-block">
              <button className="btn-primary px-10 py-3 text-base">Create Free Account</button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
