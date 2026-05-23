'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Globe, RefreshCw, Loader2, CheckCircle, Users, ExternalLink, Calendar, Plus } from 'lucide-react';
import { AdminPageHeader } from '@/components/AdminPageHeader';

interface CtfEventContest {
  contest_id: number;
  team_id: number | null;
  team_name: string | null;
}

interface CtfEvent {
  ctftime_id: number;
  title: string;
  description: string;
  start: string;
  finish: string;
  url: string;
  format: string;
  weight: number;
  already_imported: boolean;
  contests: CtfEventContest[];
}

interface Team {
  id: number;
  name: string;
}

export default function CtftimeAdmin() {
  const { data: session } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<CtfEvent[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [importingId, setImportingId] = useState<number | null>(null);
  const [teamAssignments, setTeamAssignments] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }
    const userRole = (session?.user as any)?.role;
    if (userRole !== 1) {
      router.push('/admin');
      return;
    }
    fetchEvents();
  }, [session, router]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ctftime');
      const data = await res.json();
      setEvents(Array.isArray(data.events) ? data.events : []);
      setTeams(Array.isArray(data.teams) ? data.teams : []);
    } catch (error) {
      console.error('Error fetching CTFtime events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (event: CtfEvent) => {
    const teamId = teamAssignments[event.ctftime_id];
    if (!teamId) {
      alert('Please select a team first');
      return;
    }

    setImportingId(event.ctftime_id);
    try {
      const res = await fetch('/api/admin/ctftime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ctftime_event_id: event.ctftime_id,
          team_id: parseInt(teamId),
          name: event.title,
          description: event.description,
          start_date: event.start,
          url: event.url,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        fetchEvents();
      } else {
        alert(data.error || 'Failed to import');
      }
    } catch (error) {
      console.error('Error importing event:', error);
    } finally {
      setImportingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary mb-4" size={48} />
        <p className="text-gray-400 font-mono tracking-widest">FETCHING CTFTIME EVENTS...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <AdminPageHeader
        title="CTFtime Events"
        icon={<Globe className="text-primary" />}
        count={events.length}
        actionButton={{
          label: "Refresh",
          onClick: fetchEvents,
          icon: <RefreshCw size={18} />,
        }}
      />

      {events.length === 0 ? (
        <div className="text-center py-24 bg-gray-900/30 border-2 border-dashed border-gray-800 rounded-3xl">
          <Globe className="mx-auto mb-4 text-gray-700" size={64} />
          <p className="text-gray-500 font-mono uppercase tracking-widest text-sm">No events found from CTFtime</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const selectedTeamId = teamAssignments[event.ctftime_id] || '';
            const assignedTeamIds = new Set(event.contests.map(c => c.team_id));
            const availableTeams = teams.filter(t => !assignedTeamIds.has(t.id));
            const allAssigned = teams.length > 0 && availableTeams.length === 0;
            return (
              <div
                key={event.ctftime_id}
                className={`bg-gray-900/40 border rounded-2xl overflow-hidden transition-all duration-300 ${
                  event.already_imported ? 'border-green-500/30 hover:border-green-500/50' : 'border-gray-800 hover:border-primary/30'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-white truncate">{event.title}</h3>
                        {event.already_imported && (
                          <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] font-bold rounded-full border border-green-500/30">
                            <CheckCircle size={10} /> Imported
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-primary" />
                          {formatDateTime(event.start)} — {formatDateTime(event.finish)}
                        </span>
                        {event.format && (
                          <span className="px-2 py-0.5 bg-gray-800 rounded">{event.format}</span>
                        )}
                        {event.weight > 0 && (
                          <span>Weight: {event.weight}</span>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-sm text-gray-400 mt-2 line-clamp-2">{event.description}</p>
                      )}
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-3">
                      <div className="flex items-center gap-3">
                        {event.url && (
                          <a
                            href={event.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-gray-800 text-gray-400 hover:text-primary hover:bg-gray-700 rounded-lg transition-all"
                            title="View on CTFtime"
                          >
                            <ExternalLink size={16} />
                          </a>
                        )}

                        {event.already_imported && (
                          <div className="flex flex-wrap gap-1.5 justify-end max-w-[200px]">
                            {event.contests.map((c) => (
                              <span
                                key={c.contest_id}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-[11px] font-bold rounded-lg border border-primary/30"
                              >
                                <Users size={12} /> {c.team_name || 'No team'}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {allAssigned ? (
                          <span className="text-[10px] text-gray-500 italic">All teams assigned</span>
                        ) : (
                          <>
                            <select
                              value={selectedTeamId}
                              onChange={(e) => setTeamAssignments(prev => ({ ...prev, [event.ctftime_id]: e.target.value }))}
                              className="input text-xs py-2 w-40"
                            >
                              <option value="">Select team...</option>
                              {availableTeams.map((team) => (
                                <option key={team.id} value={team.id}>{team.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleImport(event)}
                              disabled={importingId === event.ctftime_id || !selectedTeamId}
                              className="btn btn-primary flex items-center gap-2 px-4 py-2 text-xs whitespace-nowrap"
                            >
                              {importingId === event.ctftime_id ? (
                                <Loader2 className="animate-spin" size={14} />
                              ) : (
                                event.already_imported ? <Plus size={14} /> : <Users size={14} />
                              )}
                              {event.already_imported ? 'Assign More' : 'Assign & Import'}
                            </button>
                          </>
                        )}
                        {event.already_imported && (
                          <button
                            onClick={() => router.push(`/admin/contests`)}
                            className="text-[10px] text-primary/60 hover:text-primary underline whitespace-nowrap"
                          >
                            Manage
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
