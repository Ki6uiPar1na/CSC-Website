'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { compressImage } from '@/lib/image-utils';
import { Briefcase, Plus, X, Edit2, Trash2, Users, Save, Loader2, Link as LinkIcon, User } from 'lucide-react';
import { AdminPageHeader } from '@/components/AdminPageHeader';

interface Executive {
  id: number;
  name: string;
  role: string;
  session: string;
  bio?: string;
  photo_url?: string;
  social_links?: string;
}

export default function ExecutivesAdmin() {
  const { data: session } = useSession();
  const router = useRouter();
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    session: '',
    bio: '',
    photo_url: '',
    social_links: '',
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
    fetchExecutives();
  }, [session, router, currentPage]);

  const fetchExecutives = async () => {
    try {
      const res = await fetch(`/api/executives?page=${currentPage}&limit=15`);
      const data = await res.json();
      setExecutives(data.executives || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching executives:', error);
      setExecutives([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    
    try {
      const url = editingId ? `/api/executives/${editingId}` : '/api/executives';
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        resetForm();
        fetchExecutives();
      }
    } catch (error) {
      console.error('Error saving executive:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      role: '',
      session: '',
      bio: '',
      photo_url: '',
      social_links: '',
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (executive: Executive) => {
    setFormData({
      name: executive.name,
      role: executive.role,
      session: executive.session,
      bio: executive.bio || '',
      photo_url: executive.photo_url || '',
      social_links: executive.social_links || '',
    });
    setEditingId(executive.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this executive?')) return;
    
    try {
      const res = await fetch(`/api/executives/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchExecutives();
      }
    } catch (error) {
      console.error('Error deleting executive:', error);
    }
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

  const groupedBySession = executives.reduce((acc, exec) => {
    if (!acc[exec.session]) {
      acc[exec.session] = [];
    }
    acc[exec.session].push(exec);
    return acc;
  }, {} as Record<string, Executive[]>);

  const sortedSessions = Object.keys(groupedBySession).sort((a, b) => b.localeCompare(a));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary mb-4" size={48} />
        <p className="text-gray-400 font-mono tracking-widest">LOADING EXECUTIVE ROSTER...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <AdminPageHeader 
        title="Manage Executives"
        icon={<Briefcase className="text-primary" />}
        actionButton={{
          label: showForm ? "Cancel" : "Add Executive",
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
            {editingId ? 'Edit Executive Member' : 'Add New Executive Member'}
          </h2>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">Full Name</label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">Role / Designation</label>
              <input
                type="text"
                placeholder="e.g. President, Vice President"
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="input w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">Executive Session</label>
              <input
                type="text"
                placeholder="e.g. 2026-2027"
                required
                value={formData.session}
                onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                className="input w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">Profile Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="input w-full p-2 text-xs"
              />
              {isCompressing && <p className="text-primary text-[10px] animate-pulse">Processing high-quality compression...</p>}
              {formData.photo_url && !isCompressing && (
                <div className="mt-2 flex items-center gap-3 bg-primary/5 p-2 rounded border border-primary/20 max-w-fit">
                  <img src={formData.photo_url} alt="Preview" className="h-10 w-10 object-cover rounded-full border-2 border-primary" />
                  <span className="text-primary text-[10px] font-bold uppercase">Ready</span>
                </div>
              )}
            </div>
            
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">Biography / Short Intro</label>
              <textarea
                placeholder="Tell us a bit about this member..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="input w-full h-24"
              />
            </div>
            
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">Social Media (JSON format)</label>
              <textarea
                placeholder='e.g. {"linkedin": "url", "github": "url"}'
                value={formData.social_links}
                onChange={(e) => setFormData({ ...formData, social_links: e.target.value })}
                className="input w-full h-20 font-mono text-xs"
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
                {editingId ? 'Update Record' : 'Save Executive'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-12">
        {sortedSessions.length === 0 ? (
          <div className="text-center py-24 bg-gray-900/30 border-2 border-dashed border-gray-800 rounded-3xl">
            <Users className="mx-auto mb-4 text-gray-700" size={64} />
            <p className="text-gray-500 font-mono uppercase tracking-widest text-sm">No executive records found</p>
          </div>
        ) : (
          sortedSessions.map((session) => (
            <div key={session} className="space-y-6">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Session {session}</h2>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-primary/30 to-transparent"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedBySession[session].map((executive) => (
                  <div
                    key={executive.id}
                    className="group relative bg-gray-900/40 border border-gray-800 rounded-2xl p-6 hover:border-primary/40 transition-all duration-300 flex flex-col items-center text-center"
                  >
                    <div className="relative mb-6">
                      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-800 group-hover:border-primary/50 transition-colors shadow-2xl">
                        {executive.photo_url ? (
                          <img src={executive.photo_url} alt={executive.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                        ) : (
                          <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-600">
                            <User size={48} />
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-primary text-background p-2 rounded-full shadow-lg">
                        <Briefcase size={16} />
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-1">{executive.name}</h3>
                    <p className="text-primary font-mono text-xs uppercase tracking-widest mb-4">{executive.role}</p>
                    
                    {executive.bio && (
                      <p className="text-gray-400 text-sm line-clamp-2 italic mb-6">
                        "{executive.bio}"
                      </p>
                    )}
                    
                    <div className="flex items-center gap-3 w-full mt-auto pt-4 border-t border-gray-800/50">
                      <button
                        onClick={() => handleEdit(executive)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-800 hover:bg-primary hover:text-background text-gray-300 text-xs font-bold rounded-lg transition-all"
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(executive.id)}
                        className="p-2 bg-gray-800 hover:bg-red-500/10 text-gray-500 hover:text-error rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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
