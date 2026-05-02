"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Lock, ShieldCheck, BookOpen } from "lucide-react";

interface Module {
  id?: number;
  module_id?: number;
  name?: string;
  title?: string;
  description: string;
  is_premium: boolean;
  completed?: boolean;
}

export default function MaterialsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [modules, setModules] = useState<Module[]>([]);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetch("/api/user/stats")
        .then((res) => res.json())
        .then((data) => {
          // User is premium if they have an ACTIVE code (isPremium from API)
          setIsSubscribed(data.isPremium === true);
        });

      fetch("/api/modules")
        .then((res) => res.json())
        .then((data) => {
          setModules(data);
          setLoading(false);
        });
    }
  }, [session]);

  if (status === "loading" || loading) {
    return <div className="p-8 text-center text-primary font-mono animate-pulse">Loading Academy Content...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <h1 className="glitch-text text-3xl sm:text-4xl md:text-5xl mb-6">Learning Materials</h1>
      <p className="text-gray-400 text-base sm:text-lg mb-12 max-w-2xl leading-relaxed">
        Premium modules and deep-dive technical guides curated for JKKNIU-CSC members.
      </p>

      <div className="grid grid-cols-1 gap-6">
        {Array.isArray(modules) && modules.length > 0 ? (
          modules.map((module, index) => {
            const isLocked = !!module.is_premium && !isSubscribed;
            const title = module.title || module.name;
            
            return (
              <div key={index} className={`card flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all duration-300 ${isLocked ? 'opacity-80' : (!!module.is_premium ? 'border-primary' : 'border-border-color')}`}>
                <div className="grow">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h3 className="text-xl sm:text-2xl font-bold text-primary">{title}</h3>
                    {!!module.is_premium && (
                      <span className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-bold ${isLocked ? 'bg-gray-800 text-gray-500 border border-white/5' : 'bg-primary/10 text-primary border border-primary/30'}`}>
                        {isLocked ? <Lock size={10} /> : <ShieldCheck size={10} />} PREMIUM
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm sm:text-base leading-relaxed">{module.description}</p>
                </div>
                
                <div className="w-full md:w-auto shrink-0">
                  {isLocked ? (
                    <button 
                      className="w-full md:w-auto px-6 py-2.5 bg-gray-800 border-gray-700 text-gray-500 hover:bg-gray-700 transition-colors"
                      onClick={() => router.push("/profile")}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Lock size={16} />
                        <span>Upgrade to Unlock</span>
                      </div>
                    </button>
                  ) : (
                    <button 
                      className="accent w-full md:w-auto px-10 py-2.5"
                      onClick={() => router.push(`/modules/${module.id || module.module_id}`)}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <BookOpen size={16} />
                        <span>Study Now</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="card text-center py-12 text-gray-500">
            <BookOpen size={32} className="mx-auto mb-3 opacity-50" />
            <p>No modules available yet. Check back soon!</p>
          </div>
        )}
      </div>

      <div className="card mt-16 text-center border-dashed py-12">
        <p className="text-gray-500 text-sm sm:text-base font-mono">
          [ SYSTEM ] More instructional modules are currently under development.
        </p>
      </div>
    </div>
  );
}
