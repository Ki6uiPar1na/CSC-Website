"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Users, ArrowLeft, Mail, Calendar, CheckCircle, HelpCircle, Star } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { formatDate } from "@/lib/admin-utils";

interface RSVP {
  username: string;
  email: string;
  rsvp_status: 'going' | 'maybe' | 'interested';
  created_at: string;
  user_status: string;
}

interface EventInfo {
  title: string;
  capacity: number;
  registered_count: number;
}

export default function EventRSVPsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRSVPs();
  }, [id]);

  const fetchRSVPs = async () => {
    try {
      const res = await fetch(`/api/admin/events/${id}/rsvps`);
      const data = await res.json();
      if (res.ok) {
        setRsvps(data.rsvps);
        setEvent(data.event);
      }
    } catch (error) {
      console.error("Error fetching RSVPs:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const goingCount = rsvps.filter(r => r.rsvp_status === 'going').length;
  const maybeCount = rsvps.filter(r => r.rsvp_status === 'maybe').length;
  const interestedCount = rsvps.filter(r => r.rsvp_status === 'interested').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <AdminPageHeader 
          title={`RSVPs: ${event?.title}`} 
          icon={<Users className="text-primary" />} 
          count={rsvps.length}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-primary/10 border-primary/20">
          <p className="text-xs uppercase tracking-widest text-primary font-bold mb-1">Total</p>
          <p className="text-3xl font-bold">{rsvps.length}</p>
        </div>
        <div className="card bg-green-900/20 border-green-700/30">
          <p className="text-xs uppercase tracking-widest text-green-400 font-bold mb-1">Going</p>
          <p className="text-3xl font-bold text-green-400">{goingCount}</p>
        </div>
        <div className="card bg-accent/20 border-accent/30">
          <p className="text-xs uppercase tracking-widest text-accent font-bold mb-1">Maybe</p>
          <p className="text-3xl font-bold text-accent">{maybeCount}</p>
        </div>
        <div className="card bg-blue-900/20 border-blue-700/30">
          <p className="text-xs uppercase tracking-widest text-blue-400 font-bold mb-1">Interested</p>
          <p className="text-3xl font-bold text-blue-400">{interestedCount}</p>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900/50 border-b border-gray-800">
                <th className="p-4 text-xs uppercase tracking-widest font-bold text-gray-400">User</th>
                <th className="p-4 text-xs uppercase tracking-widest font-bold text-gray-400">Status</th>
                <th className="p-4 text-xs uppercase tracking-widest font-bold text-gray-400">RSVP Date</th>
              </tr>
            </thead>
            <tbody>
              {rsvps.map((rsvp, idx) => (
                <tr key={idx} className="border-b border-gray-800 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-white">{rsvp.username}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Mail size={12} /> {rsvp.email}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                      rsvp.rsvp_status === 'going' ? 'bg-green-900/30 text-green-400 border-green-700/50' :
                      rsvp.rsvp_status === 'maybe' ? 'bg-accent/20 text-accent border-accent/30' :
                      'bg-blue-900/30 text-blue-400 border-blue-700/50'
                    }`}>
                      {rsvp.rsvp_status === 'going' ? <CheckCircle size={12} /> : 
                       rsvp.rsvp_status === 'maybe' ? <HelpCircle size={12} /> : <Star size={12} />}
                      {rsvp.rsvp_status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-primary" />
                      {formatDate(rsvp.created_at)}
                    </div>
                  </td>
                </tr>
              ))}
              {rsvps.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-12 text-center text-gray-500">
                    No RSVPs found for this event.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
