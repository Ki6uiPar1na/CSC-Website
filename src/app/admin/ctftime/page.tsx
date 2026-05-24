'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Globe, RefreshCw, Loader2, CheckCircle, Users,
  ExternalLink, Calendar, Plus, Search, X, Clock,
  Filter, BarChart3
} from 'lucide-react';
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

function getEventStatus(start: string, finish: string) {
  const now = new Date();
  const startDate = new Date(start);
  const finishDate = new Date(finish);
  if (now < startDate) return { label: 'Upcoming', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' };
  if (now > finishDate) return { label: 'Ended', color: 'text-gray-500 border-gray-600/30 bg-gray-800/50' };
  return { label: 'Live', color: 'text-green-400 border-green-500/30 bg-green-500/10' };
}

function getDurationHours(start: string, finish: string) {
  const diff = new Date(finish).getTime() - new Date(start).getTime();
  const hours = Math.round(diff / (1000 * 60 * 60));
  if (hours < 1) return '<1h';
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

function SkeletonCard() {
  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-gray-800 rounded w-3/5" />
          <div className="h-3 bg-gray-800 rounded w-2/5" />
          <div className="h-3 bg-gray-800 rounded w-4/5" />
        </div>
        <div className="shrink-0 space-y-2">
          <div className="h-8 bg-gray-800 rounded w-32" />
          <div className="h-6 bg-gray-800 rounded w-20" />
        </div>
      </div>
    </div>
  );
}

export default function CtftimeAdmin() {
  const { data: session } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<CtfEvent[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [importingId, setImportingId] = useState<number | null>(null);
  const [teamAssignments, setTeamAssignments] = useState<Record<number, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'live' | 'ended'>('all');
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

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
      setLastFetched(new Date());
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

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const statusCounts = useMemo(() => {
    let upcoming = 0, live = 0, ended = 0, imported = 0;
    for (const e of events) {
      const status = getEventStatus(e.start, e.finish);
      if (status.label === 'Upcoming') upcoming++;
      else if (status.label === 'Live') live++;
      else ended++;
      if (e.already_imported) imported++;
    }
    return { upcoming, live, ended, imported, total: events.length };
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!event.title.toLowerCase().includes(q) && !(event.description || '').toLowerCase().includes(q)) return false;
      }
      if (statusFilter !== 'all') {
        const status = getEventStatus(event.start, event.finish).label.toLowerCase();
        if (status !== statusFilter) return false;
      }
      return true;
    });
  }, [events, searchQuery, statusFilter]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <AdminPageHeader
        title="CTFtime Events"
        icon={<Globe className="text-primary" />}
        actionButton={{
          label: "Refresh",
          onClick: fetchEvents,
          icon: <RefreshCw size={18} />,
          loading: loading,
        }}
      />

      {/* Stats bar */}
      {!loading && events.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-gray-900/40 border border-gray-800 rounded-xl px-4 py-3">
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Total</p>
            <p className="text-xl font-bold text-white mt-0.5">{statusCounts.total}</p>
          </div>
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3">
            <p className="text-[10px] text-blue-400 font-mono uppercase tracking-wider">Upcoming</p>
            <p className="text-xl font-bold text-blue-300 mt-0.5">{statusCounts.upcoming}</p>
          </div>
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl px-4 py-3">
            <p className="text-[10px] text-green-400 font-mono uppercase tracking-wider">Live</p>
            <p className="text-xl font-bold text-green-300 mt-0.5">{statusCounts.live}</p>
          </div>
          <div className="bg-gray-500/5 border border-gray-600/20 rounded-xl px-4 py-3">
            <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Ended</p>
            <p className="text-xl font-bold text-gray-300 mt-0.5">{statusCounts.ended}</p>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
            <p className="text-[10px] text-primary font-mono uppercase tracking-wider">Imported</p>
            <p className="text-xl font-bold text-primary mt-0.5">{statusCounts.imported}</p>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      {!loading && events.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search events by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9 pr-8 py-2 text-sm w-full"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {(['all', 'upcoming', 'live', 'ended'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all whitespace-nowrap ${
                  statusFilter === s
                    ? 'bg-primary/20 border-primary/50 text-primary'
                    : 'bg-gray-900/40 border-gray-800 text-gray-400 hover:border-gray-600'
                }`}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-24 bg-gray-900/30 border-2 border-dashed border-gray-800 rounded-3xl">
          {searchQuery || statusFilter !== 'all' ? (
            <>
              <Search size={48} className="mx-auto mb-4 text-gray-700" />
              <p className="text-gray-400 font-mono text-sm mb-2">No matching events</p>
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                className="text-xs text-primary hover:underline"
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <Globe className="mx-auto mb-4 text-gray-700" size={64} />
              <p className="text-gray-500 font-mono uppercase tracking-widest text-sm">No events found from CTFtime</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEvents.map((event) => {
            const selectedTeamId = teamAssignments[event.ctftime_id] || '';
            const assignedTeamIds = new Set(event.contests.map(c => c.team_id));
            const availableTeams = teams.filter(t => !assignedTeamIds.has(t.id));
            const allAssigned = teams.length > 0 && availableTeams.length === 0;
            const status = getEventStatus(event.start, event.finish);
            const duration = getDurationHours(event.start, event.finish);

            return (
              <div
                key={event.ctftime_id}
                className={`group bg-gray-900/40 border rounded-xl overflow-hidden transition-all duration-200 hover:bg-gray-900/60 ${
                  event.already_imported
                    ? 'border-green-500/20 hover:border-green-500/40'
                    : 'border-gray-800 hover:border-primary/30'
                }`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    {/* Left: Event info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${status.color}`}>
                          {status.label}
                        </span>
                        {event.already_imported && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/10 text-green-400 text-[10px] font-bold rounded-full border border-green-500/30">
                            <CheckCircle size={9} /> Imported
                          </span>
                        )}
                        {event.format && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 rounded-full text-gray-400 border border-gray-700">
                            {event.format}
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-800/50 rounded-full text-gray-500 font-mono">
                          {duration}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white truncate group-hover:text-primary transition-colors">
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-mono mt-1">
                        <Calendar size={11} className="text-primary shrink-0" />
                        <span>{formatDateTime(event.start)}</span>
                        <span className="text-gray-700">—</span>
                        <span>{formatDateTime(event.finish)}</span>
                        {event.weight > 0 && (
                          <>
                            <span className="text-gray-700 mx-0.5">·</span>
                            <span>Weight: {event.weight}</span>
                          </>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-1 leading-relaxed">{event.description}</p>
                      )}
                      {/* Assigned teams */}
                      {event.already_imported && event.contests.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {event.contests.map((c) => (
                            <span
                              key={c.contest_id}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded-md border border-primary/20"
                            >
                              <Users size={10} /> {c.team_name || 'Unassigned'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex sm:flex-col items-center sm:items-stretch gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        {event.url && (
                          <a
                            href={event.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-gray-800 text-gray-500 hover:text-primary hover:bg-gray-700 rounded-lg transition-all"
                            title="View on CTFtime"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                        {allAssigned ? (
                          <span className="text-[10px] text-gray-600 italic px-2">All teams assigned</span>
                        ) : (
                          <>
                            <select
                              value={selectedTeamId}
                              onChange={(e) => setTeamAssignments(prev => ({ ...prev, [event.ctftime_id]: e.target.value }))}
                              className="input text-xs py-1.5 w-36 sm:w-32"
                            >
                              <option value="">Select team...</option>
                              {availableTeams.map((team) => (
                                <option key={team.id} value={team.id}>{team.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleImport(event)}
                              disabled={importingId === event.ctftime_id || !selectedTeamId}
                              className="btn btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs whitespace-nowrap"
                            >
                              {importingId === event.ctftime_id ? (
                                <Loader2 className="animate-spin" size={12} />
                              ) : event.already_imported ? (
                                <Plus size={12} />
                              ) : (
                                <Users size={12} />
                              )}
                              <span className="hidden sm:inline">{event.already_imported ? 'Assign More' : 'Assign & Import'}</span>
                              <span className="sm:hidden">{event.already_imported ? 'More' : 'Import'}</span>
                            </button>
                          </>
                        )}
                        {event.already_imported && (
                          <button
                            onClick={() => router.push(`/admin/contests`)}
                            className="text-[10px] text-primary/50 hover:text-primary underline whitespace-nowrap"
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

      {/* Last fetched timestamp */}
      {lastFetched && !loading && (
        <p className="text-[10px] text-gray-600 font-mono text-center">
          Last updated: {lastFetched.toLocaleString()}
        </p>
      )}
    </div>
  );
}
