'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { compressImage } from '@/lib/image-utils';
import { Trophy, Plus, X, Edit2, Trash2, Calendar, FileText, Users, Save, Loader2 } from 'lucide-react';
import { AdminPageHeader } from '@/components/AdminPageHeader';

interface Contest {
  id: number;
  name: string;
  description: string;
  event_date: string;
  photo_url?: string;
  details?: string;
  winners?: string;
  team_id?: number | null;
  team_name?: string | null;
}

interface Team {
  id: number;
  name: string;
}

export default function ContestsAdmin() {
  const { data: session } = useSession();
  const router = useRouter();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [fetchingCtftime, setFetchingCtftime] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    event_date: '',
    photo_url: '',
    details: '',
    winners: '',
    team_id: '',
  });

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
    fetchContests();
    fetchTeams();
  }, [session, router]);

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/admin/teams');
      const data = await res.json();
      setTeams(Array.isArray(data.teams) ? data.teams : []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchContests = async () => {
    try {
      const res = await fetch('/api/contests', {
        cache: 'no-store'
      });
      const data = await res.json();
      setContests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching contests:', error);
      setContests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFromCtftime = async () => {
    if (!confirm('Fetch upcoming/past CTF events from CTFtime? This will import new contests.')) return;
    setFetchingCtftime(true);
    try {
      const res = await fetch('/api/admin/contests/fetch-ctftime', { method: 'POST' });
      const data = await res.json();
      alert(data.message || data.error || 'Done');
      if (res.ok) fetchContests();
    } catch (error) {
      alert('Failed to fetch from CTFtime');
    } finally {
      setFetchingCtftime(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    
    try {
      const url = editingId ? `/api/contests/${editingId}` : '/api/contests';
      const method = editingId ? 'PUT' : 'POST';
      
      const body = {
        ...formData,
        team_id: formData.team_id ? parseInt(formData.team_id) : null,
      };
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (res.ok) {
        resetForm();
        fetchContests();
      }
    } catch (error) {
      console.error('Error saving contest:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      event_date: '',
      photo_url: '',
      details: '',
      winners: '',
      team_id: '',
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (contest: Contest) => {
    setFormData({
      name: contest.name,
      description: contest.description,
      event_date: contest.event_date ? new Date(contest.event_date).toISOString().slice(0, 16) : '',
      photo_url: contest.photo_url || '',
      details: contest.details || '',
      winners: contest.winners || '',
      team_id: contest.team_id ? String(contest.team_id) : '',
    });
    setEditingId(contest.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const base64 = await compressImage(file, 1.5, 1.0);
      setFormData({ ...formData, photo_url: base64 });
    } catch (error: any) {
      alert(error.message || 'Error compressing image');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this contest?')) return;
    
    try {
      const res = await fetch(`/api/contests/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchContests();
      }
    } catch (error) {
      console.error('Error deleting contest:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary mb-4" size={48} />
        <p className="text-gray-400 font-mono tracking-widest">INITIALIZING CONTESTS...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <AdminPageHeader 
        title="Manage Contests"
        icon={<Trophy className="text-primary" />}
        actionButton={{
          label: showForm ? "Cancel" : "Add Contest",
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
            {editingId ? 'Edit Contest' : 'Register New Contest'}
          </h2>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">Contest Name</label>
              <input
                type="text"
                placeholder="e.g. Inter-University Programming Contest 2025"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input w-full"
              />
            </div>
            
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">Description (Short)</label>
              <textarea
                placeholder="Briefly describe the contest..."
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input w-full h-20"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">Event Date & Time</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="datetime-local"
                  required
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="input w-full pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">Contest Poster / Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="input w-full p-2"
              />
              {isCompressing && <p className="text-primary text-xs animate-pulse">Compressing image data...</p>}
              {formData.photo_url && !isCompressing && (
                <div className="mt-2 flex items-center gap-3 bg-primary/10 p-2 rounded border border-primary/20">
                  <img src={formData.photo_url} alt="Preview" className="h-12 w-12 object-cover rounded shadow-lg" />
                  <p className="text-primary text-[10px] font-bold uppercase tracking-tighter">Image Optimized</p>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">Assign Team</label>
              <select
                value={formData.team_id}
                onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                className="input w-full"
              >
                <option value="">No team assigned</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">Full Contest Details (Markdown)</label>
              <textarea
                placeholder="Detailed information, rules, and eligibility..."
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                className="input w-full h-32 font-mono text-sm"
              />
            </div>
            
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">Winners (JSON format or Text)</label>
              <textarea
                placeholder='e.g. [{"rank": 1, "name": "Team X"}, ...]'
                value={formData.winners}
                onChange={(e) => setFormData({ ...formData, winners: e.target.value })}
                className="input w-full h-24 font-mono text-sm"
              />
            </div>
            
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
                disabled={actionLoading || isCompressing}
                className="btn btn-primary px-10 flex items-center gap-2"
              >
                {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {editingId ? 'Update Contest' : 'Publish Contest'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {contests.length === 0 ? (
          <div className="text-center py-24 bg-gray-900/30 border-2 border-dashed border-gray-800 rounded-3xl">
            <Trophy className="mx-auto mb-4 text-gray-700" size={64} />
            <p className="text-gray-500 font-mono uppercase tracking-widest text-sm">No historical contests recorded</p>
          </div>
        ) : (
          contests.map((contest) => (
            <div key={contest.id} className="group relative overflow-hidden bg-gray-900/40 border border-gray-800 rounded-2xl hover:border-primary/50 transition-all duration-300">
              <div className="flex flex-col md:flex-row items-stretch">
                {/* Image Section */}
                <div className="w-full md:w-48 h-48 md:h-auto relative bg-gray-800 shrink-0">
                  {contest.photo_url ? (
                    <img src={contest.photo_url} alt={contest.name} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-700">
                      <Trophy size={48} />
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="flex-1 p-6 space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{contest.name}</h3>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 font-mono">
                        <span className="flex items-center gap-1.5"><Calendar size={14} className="text-primary" /> {new Date(contest.event_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        {contest.winners && <span className="flex items-center gap-1.5"><Users size={14} className="text-green-500" /> Results Declared</span>}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleEdit(contest)}
                        className="p-2 bg-gray-800 text-gray-400 hover:text-primary hover:bg-gray-700 rounded-lg transition-all"
                        title="Edit Contest"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(contest.id)}
                        className="p-2 bg-gray-800 text-gray-400 hover:text-error hover:bg-red-500/10 rounded-lg transition-all"
                        title="Delete Contest"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">
                    {contest.description}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {contest.details && (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded-full border border-blue-500/20">
                        <FileText size={12} /> Rich Details
                      </span>
                    )}
                    {contest.team_name && (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider rounded-full border border-primary/20">
                        <Users size={12} /> {contest.team_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider rounded-full border border-primary/20">
                      ID: {contest.id}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
