import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center text-center py-12 md:py-20">
      <h1 className="glitch-text text-4xl sm:text-5xl md:text-7xl mb-4 font-bold tracking-tighter">JKKNIU-CSC</h1>
      <p className="text-lg sm:text-xl md:text-2xl text-foreground mb-2 font-medium px-4">
        Jatiya Kabi Kazi Nazrul Islam University
      </p>
      <p className="text-base sm:text-lg text-gray-400 mb-2 font-semibold px-4">
        Cyber Security Club
      </p>
      <p className="text-base sm:text-lg text-gray-400 mb-12 max-w-2xl px-4 mx-auto leading-relaxed">
        Protecting the Digital Frontier. The premier hub for cyber security enthusiasts at JKKNIU. Learn, compete, and secure the future.
      </p>
      
      <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 w-full max-w-lg px-4">
        <Link href="/challenges" className="flex-1">
          <button className="w-full h-full py-4 text-lg font-bold">Launch Platform</button>
        </Link>
        <Link href="/about" className="flex-1">
          <button className="accent w-full h-full py-4 text-lg font-bold">Our Club</button>
        </Link>
      </div>
      
      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        <div className="card text-left p-8">
          <div className="text-primary text-4xl mb-4">⚡</div>
          <h3 className="text-xl font-bold mb-2">Dynamic Scoring</h3>
          <p className="text-gray-400 text-sm leading-relaxed">Challenges lose value as more people solve them. Speed is key to staying on top.</p>
        </div>
        <div className="card text-left p-8">
          <div className="text-accent text-4xl mb-4">🔥</div>
          <h3 className="text-xl font-bold mb-2">Streak Bonus</h3>
          <p className="text-gray-400 text-sm leading-relaxed">Stay consistent. Maintain your daily login streak to earn significant point multipliers.</p>
        </div>
        <div className="card text-left p-8">
          <div className="text-primary text-4xl mb-4">🛠️</div>
          <h3 className="text-xl font-bold mb-2">Module Mastery</h3>
          <p className="text-gray-400 text-sm leading-relaxed">Complete entire challenge categories to unlock massive completion bonuses.</p>
        </div>
      </div>

      <div className="mt-16 text-center px-4">
        <p className="text-gray-400 mb-6 text-lg font-semibold">Quick Links</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8">
          <Link href="/executive" className="card p-3 hover:border-primary transition-colors text-center">
            <div className="text-xl mb-2">👥</div>
            <span className="text-xs font-semibold uppercase">Executive</span>
          </Link>
          <Link href="/alumni" className="card p-3 hover:border-primary transition-colors text-center">
            <div className="text-xl mb-2">🎓</div>
            <span className="text-xs font-semibold uppercase">Alumni</span>
          </Link>
          <Link href="/events" className="card p-3 hover:border-primary transition-colors text-center">
            <div className="text-xl mb-2">📅</div>
            <span className="text-xs font-semibold uppercase">Events</span>
          </Link>
          <Link href="/contests" className="card p-3 hover:border-primary transition-colors text-center">
            <div className="text-xl mb-2">🏆</div>
            <span className="text-xs font-semibold uppercase">Contests</span>
          </Link>
          <Link href="/achievements" className="card p-3 hover:border-primary transition-colors text-center">
            <div className="text-xl mb-2">⭐</div>
            <span className="text-xs font-semibold uppercase">Achievements</span>
          </Link>
          <Link href="/leaderboard" className="card p-3 hover:border-primary transition-colors text-center">
            <div className="text-xl mb-2">📊</div>
            <span className="text-xs font-semibold uppercase">Leaderboard</span>
          </Link>
        </div>
      </div>

      <div className="mt-16 text-center px-4">
        <p className="text-gray-400 mb-6">Ready to join our community?</p>
        <Link href="/register">
          <button className="accent px-10 py-3">Initialize Account</button>
        </Link>
      </div>
    </div>
  );
}
