'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Users, Plus, X, Edit2, Trash2, UserPlus, UserMinus, Save, Loader2, ChevronDown, ChevronRight, Globe } from 'lucide-react';
import { AdminPageHeader } from '@/components/AdminPageHeader';

interface Team {
  id: number;
  name: string;
  description: string | null;
  ctftime_team_id: number | null;
  created_at: string;
  member_count: number;
}

interface TeamMember {
  id: number;
  team_id: number;
  user_id: number;
  username: string;
  email: string;
  joined_at: string;
}

interface SimpleUser {
  id: number;
  username: string;
  email: string;
}

export default function TeamsAdmin() {
  const { data: session } = useSession();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);
  const [teamMembers, setTeamMembers] = useState<Record<number, TeamMember[]>>({});
  const [allUsers, setAllUsers] = useState<SimpleUser[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ctftime_team_id: '',
  });
  const [fetchingCtftime, setFetchingCtftime] = useState(false);
  const [ctftimeData, setCtftimeData] = useState<{ rating: Record<string, any>; participated_events: any[]; country: string; logo: string; primary_alias: string; members: any[] } | null>(null);

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }
    const userRole = (session?.user as any)?.role;
    if (userRole !== 1 && userRole !== 2) {
      router.push('/');
      return;
    }
    fetchTeams();
    fetchAllUsers();
  }, [session, router, currentPage]);

  const fetchTeams = async () => {
    try {
      const res = await fetch(`/api/admin/teams?page=${currentPage}&limit=15`);
      const data = await res.json();
      setTeams(data.teams || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await fetch('/api/admin/users/simple');
      const data = await res.json();
      setAllUsers(Array.isArray(data.users) ? data.users : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchTeamMembers = async (teamId: number) => {
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/members`);
      const data = await res.json();
      setTeamMembers(prev => ({ ...prev, [teamId]: Array.isArray(data.members) ? data.members : [] }));
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setMembersLoading(false);
    }
  };

  const toggleTeamExpand = (teamId: number) => {
    if (expandedTeam === teamId) {
      setExpandedTeam(null);
    } else {
      setExpandedTeam(teamId);
      if (!teamMembers[teamId]) {
        fetchTeamMembers(teamId);
      }
    }
  };

  const fetchCtftimeTeam = async () => {
    const id = formData.ctftime_team_id.trim();
    if (!id) return;
    setFetchingCtftime(true);
    setCtftimeData(null);
    try {
      const res = await fetch(`/api/admin/ctftime/team/${id}`);
      if (!res.ok) throw new Error('Team not found on CTFtime');
      const data = await res.json();
      setFormData(prev => ({
        ...prev,
        name: data.name || prev.name,
        description: data.primary_alias || data.name || prev.description,
      }));
      setCtftimeData({
        rating: data.rating || {},
        participated_events: data.participated_events || [],
        country: data.country || '',
        logo: data.logo || '',
        primary_alias: data.primary_alias || '',
        members: data.members || [],
      });
    } catch (err: any) {
      alert(err.message || 'Failed to fetch from CTFtime');
    } finally {
      setFetchingCtftime(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const url = editingId ? `/api/admin/teams/${editingId}` : '/api/admin/teams';
      const method = editingId ? 'PUT' : 'POST';

      const body = {
        ...formData,
        ctftime_team_id: formData.ctftime_team_id ? parseInt(formData.ctftime_team_id) : null,
        ctftime_logo: ctftimeData?.logo || null,
        ctftime_country: ctftimeData?.country || null,
        ctftime_primary_alias: ctftimeData?.primary_alias || null,
        ctftime_rating: ctftimeData?.rating || null,
        ctftime_members: ctftimeData?.members || null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        resetForm();
        fetchTeams();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save team');
      }
    } catch (error) {
      console.error('Error saving team:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', ctftime_team_id: '' });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (team: Team) => {
    setFormData({
      name: team.name,
      description: team.description || '',
      ctftime_team_id: team.ctftime_team_id ? String(team.ctftime_team_id) : '',
    });
    setEditingId(team.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this team? Members will be removed.')) return;

    try {
      const res = await fetch(`/api/admin/teams/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setExpandedTeam(null);
        fetchTeams();
      }
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  };

  const handleAddMember = async (teamId: number) => {
    if (!selectedUserId) return;

    try {
      const res = await fetch(`/api/admin/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: parseInt(selectedUserId) }),
      });

      if (res.ok) {
        setSelectedUserId('');
        fetchTeamMembers(teamId);
        fetchTeams();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add member');
      }
    } catch (error) {
      console.error('Error adding member:', error);
    }
  };

  const handleRemoveMember = async (teamId: number, userId: number) => {
    if (!confirm('Remove this member from the team?')) return;

    try {
      const res = await fetch(`/api/admin/teams/${teamId}/members/${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchTeamMembers(teamId);
        fetchTeams();
      }
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const getAvailableUsers = (teamId: number) => {
    const memberIds = new Set((teamMembers[teamId] || []).map(m => m.user_id));
    return allUsers.filter(u => !memberIds.has(u.id));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary mb-4" size={48} />
        <p className="text-gray-400 font-mono tracking-widest">LOADING TEAMS...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <AdminPageHeader
        title="Manage Teams"
        icon={<Users className="text-primary" />}
        count={teams.length}
        actionButton={{
          label: showForm ? "Cancel" : "Create Team",
          onClick: () => {
            if (showForm) resetForm();
            else setShowForm(true);
          },
          icon: showForm ? <X size={18} /> : <Plus size={18} />
        }}
      />

      {showForm && (
        <div className="card bg-gray-900/50 border-primary/20 backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            {editingId ? <Edit2 className="text-primary" size={24} /> : <Plus className="text-primary" size={24} />}
            {editingId ? 'Edit Team' : 'Create New Team'}
          </h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">Team Name</label>
              <input
                type="text"
                placeholder="e.g. Team-A, Team-B"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">Description (optional)</label>
              <input
                type="text"
                placeholder="Brief description of the team"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">CTFtime Team ID</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="e.g. 401690"
                  value={formData.ctftime_team_id}
                  onChange={(e) => setFormData({ ...formData, ctftime_team_id: e.target.value })}
                  className="input flex-1"
                />
                <button
                  type="button"
                  onClick={fetchCtftimeTeam}
                  disabled={fetchingCtftime || !formData.ctftime_team_id.trim()}
                  className="btn btn-secondary flex items-center gap-2 px-4"
                >
                  {fetchingCtftime ? <Loader2 className="animate-spin" size={16} /> : <Globe size={16} />}
                  Fetch
                </button>
              </div>
              <p className="text-[10px] text-gray-500 font-mono">Enter a CTFtime team ID to auto-fill name & description</p>
            </div>

            {ctftimeData && (
              <div className="md:col-span-2 bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {ctftimeData.logo && (
                    <img src={ctftimeData.logo} alt="" className="w-10 h-10 rounded-full object-cover border border-primary/30" />
                  )}
                  <div>
                    <p className="text-sm font-bold text-white">{formData.name}</p>
                    <p className="text-xs text-gray-400">{ctftimeData.country ? `Country: ${ctftimeData.country}` : ''}</p>
                  </div>
                </div>

                {Object.keys(ctftimeData.rating).length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1.5">Country Rank by Year</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(ctftimeData.rating)
                        .filter(([_, v]: any) => v?.country_place)
                        .sort(([a], [b]) => Number(b) - Number(a))
                        .slice(0, 6)
                        .map(([year, data]: any) => (
                          <span key={year} className="px-2 py-0.5 bg-gray-800 rounded text-[10px] font-mono text-gray-300">
                            {year}: #{data.country_place}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {ctftimeData.participated_events.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1.5">
                      Recent CTF Participations ({ctftimeData.participated_events.length} total)
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {ctftimeData.participated_events.slice(0, 15).map((e: any) => (
                        <div key={e.event_id} className="flex items-center gap-2 text-xs text-gray-400">
                          <span className="text-[10px] text-gray-600 font-mono shrink-0">{e.year}</span>
                          <span className="truncate">{e.title}</span>
                          {e.place && <span className="shrink-0 text-primary">#{e.place}</span>}
                        </div>
                      ))}
                    </div>
              {ctftimeData.members && ctftimeData.members.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1.5">
                    CTFtime Members ({ctftimeData.members.length})
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {ctftimeData.members.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-2 text-xs text-gray-400">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                          {(m.name || '?')[0].toUpperCase()}
                        </div>
                        <a
                          href={`https://ctftime.org/user/${m.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-primary transition-colors truncate"
                        >
                          {m.name}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

                  </div>
                )}
              </div>
            )}

            <div className="md:col-span-2 flex justify-end gap-4 pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={resetForm}
                className="btn btn-secondary px-8"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="btn btn-primary px-10 flex items-center gap-2"
              >
                {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {editingId ? 'Update Team' : 'Create Team'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {teams.length === 0 ? (
          <div className="text-center py-24 bg-gray-900/30 border-2 border-dashed border-gray-800 rounded-3xl">
            <Users className="mx-auto mb-4 text-gray-700" size={64} />
            <p className="text-gray-500 font-mono uppercase tracking-widest text-sm">No teams found</p>
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary mt-6 inline-flex items-center gap-2"
            >
              <Plus size={18} /> Create Your First Team
            </button>
          </div>
        ) : (
          teams.map((team) => (
            <div key={team.id} className="bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300">
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-800/30 transition-colors"
                onClick={() => toggleTeamExpand(team.id)}
              >
                <div className="flex items-center gap-4">
                  {expandedTeam === team.id ? (
                    <ChevronDown size={20} className="text-primary" />
                  ) : (
                    <ChevronRight size={20} className="text-gray-500" />
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-white">{team.name}</h3>
                    {team.description && (
                      <p className="text-sm text-gray-400 mt-0.5">{team.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
                    <Users size={14} />
                    {team.member_count} members
                  </span>
                  {team.ctftime_team_id && (
                    <a
                      href={`https://ctftime.org/team/${team.ctftime_team_id}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-primary/60 hover:text-primary bg-gray-800 px-2 py-1 rounded-full transition-colors"
                      title="View on CTFtime"
                    >
                      <Globe size={12} /> CTFtime
                    </a>
                  )}
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEdit(team)}
                      className="p-2 bg-gray-800 hover:bg-primary hover:text-background text-gray-300 rounded-lg transition-all"
                      title="Edit team"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(team.id)}
                      className="p-2 bg-gray-800 hover:bg-red-500/10 text-gray-500 hover:text-error rounded-lg transition-all"
                      title="Delete team"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {expandedTeam === team.id && (
                <div className="border-t border-gray-800 p-5 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-end gap-3 mb-6">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider font-mono mb-1 block">
                        Add Member
                      </label>
                      <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="input w-full"
                      >
                        <option value="">Select a user...</option>
                        {getAvailableUsers(team.id).map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.username} ({user.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => handleAddMember(team.id)}
                      disabled={!selectedUserId}
                      className="btn btn-primary flex items-center gap-2 px-6"
                    >
                      <UserPlus size={16} /> Add
                    </button>
                  </div>

                  {membersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="animate-spin text-primary" size={24} />
                    </div>
                  ) : (teamMembers[team.id]?.length || 0) === 0 ? (
                    <div className="text-center py-8 bg-gray-800/20 rounded-xl border border-dashed border-gray-700">
                      <UserPlus className="mx-auto mb-2 text-gray-600" size={32} />
                      <p className="text-gray-500 text-sm font-mono">No members in this team yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(teamMembers[team.id] || []).map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between bg-gray-800/30 rounded-xl px-4 py-3 hover:bg-gray-800/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users size={16} className="text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{member.username}</p>
                              <p className="text-xs text-gray-500">{member.email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveMember(team.id, member.user_id)}
                            className="p-2 bg-gray-800 hover:bg-red-500/10 text-gray-500 hover:text-error rounded-lg transition-all"
                            title="Remove member"
                          >
                            <UserMinus size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
          >
            Previous
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>Page {currentPage} of {totalPages}</span>
          </div>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
