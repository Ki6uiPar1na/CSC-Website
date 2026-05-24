'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { compressImage } from '@/lib/image-utils';
import { GraduationCap, Plus, X, Edit2, Trash2, Users, Save, Loader2, User, Calendar, CheckCircle } from 'lucide-react';
import { AdminPageHeader } from '@/components/AdminPageHeader';

interface Alumni {
  id: number;
  name: string;
  graduation_year: number;
  session?: string;
  role_title?: string;
  bio?: string;
  photo_url?: string;
  achievements?: string;
  social_links?: string;
}

export default function AlumniAdmin() {
  const { data: session } = useSession();
  const router = useRouter();
  const [alumni, setAlumni] = useState<Alumni[]>([]);
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
    graduation_year: new Date().getFullYear(),
    session: '2021-2022',
    role_title: '',
    bio: '',
    photo_url: '',
    achievements: '',
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
    fetchAlumni();
  }, [session, router, currentPage]);

  const fetchAlumni = async () => {
    try {
      const res = await fetch(`/api/alumni?page=${currentPage}&limit=15`);
      const data = await res.json();
      setAlumni(data.alumni || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching alumni:', error);
      setAlumni([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    
    try {
      const url = editingId ? `/api/alumni/${editingId}` : '/api/alumni';
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        resetForm();
        fetchAlumni();
      }
    } catch (error) {
      console.error('Error saving alumni:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      graduation_year: new Date().getFullYear(),
      session: '2021-2022',
      role_title: '',
      bio: '',
      photo_url: '',
      achievements: '',
      social_links: '',
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (alum: Alumni) => {
    setFormData({
      name: alum.name,
      graduation_year: alum.graduation_year,
      session: alum.session || '2021-2022',
      role_title: alum.role_title || '',
      bio: alum.bio || '',
      photo_url: alum.photo_url || '',
      achievements: alum.achievements || '',
      social_links: alum.social_links || '',
    });
    setEditingId(alum.id);
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
    if (!confirm('Are you sure you want to delete this alumni member?')) return;
    
    try {
      const res = await fetch(`/api/alumni/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAlumni();
      }
    } catch (error) {
      console.error('Error deleting alumni:', error);
    }
  };

  // Group alumni by graduation year
  const groupedByYear = alumni.reduce((acc, alum) => {
    if (!acc[alum.graduation_year]) {
      acc[alum.graduation_year] = [];
    }
    acc[alum.graduation_year].push(alum);
    return acc;
  }, {} as Record<number, Alumni[]>);

  const sortedYears = Object.keys(groupedByYear).map(Number).sort((a, b) => b - a);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary mb-4" size={48} />
        <p className="text-gray-400 font-mono tracking-widest">GATHERING ALUMNI DATA...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <AdminPageHeader 
        title="Manage Alumni"
        icon={<GraduationCap className="text-primary" />}
        actionButton={{
          label: showForm ? "Cancel" : "Add Alumni",
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
            {editingId ? 'Edit Alumni Profile' : 'Add New Alumni'}
          </h2>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Jane Smith"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">Graduation Year</label>
              <input
                type="number"
                placeholder="e.g. 2024"
                required
                value={formData.graduation_year}
                onChange={(e) => setFormData({ ...formData, graduation_year: Number(e.target.value) })}
                className="input w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">Academic Session</label>
              <input
                type="text"
                placeholder="e.g. 2020-2021"
                value={formData.session}
                onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                className="input w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">Current Role / Title</label>
              <input
                type="text"
                placeholder="e.g. Software Engineer at Google"
                value={formData.role_title}
                onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
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
              {isCompressing && <p className="text-primary text-[10px] animate-pulse font-mono uppercase tracking-tighter">Compressing for cloud optimization...</p>}
              {formData.photo_url && !isCompressing && (
                <div className="mt-2 flex items-center gap-2 bg-primary/10 px-2 py-1 rounded max-w-fit">
                  <CheckCircle size={14} className="text-primary" />
                  <span className="text-primary text-[10px] font-bold">IMAGE READY</span>
                </div>
              )}
            </div>
            
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">Biography</label>
              <textarea
                placeholder="Short bio about the alumni's journey..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="input w-full h-24"
              />
            </div>
            
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">Achievements</label>
              <textarea
                placeholder="Major achievements, awards, or projects..."
                value={formData.achievements}
                onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
                className="input w-full h-20"
              />
            </div>
            
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider font-mono">Social Links (JSON format)</label>
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
                {editingId ? 'Update Profile' : 'Add Alumni'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-12">
        {sortedYears.length === 0 ? (
          <div className="text-center py-24 bg-gray-900/30 border-2 border-dashed border-gray-800 rounded-3xl">
            <Users className="mx-auto mb-4 text-gray-700" size={64} />
            <p className="text-gray-500 font-mono uppercase tracking-widest text-sm">No alumni records found</p>
          </div>
        ) : (
          sortedYears.map((year) => (
            <div key={year} className="space-y-6">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Batch {year}</h2>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-primary/30 to-transparent"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedByYear[year].map((alum) => (
                  <div
                    key={alum.id}
                    className="group bg-gray-900/40 border border-gray-800 rounded-2xl p-5 hover:border-primary/40 transition-all duration-300"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-700 shrink-0">
                        {alum.photo_url ? (
                          <img src={alum.photo_url} alt={alum.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-600">
                            <User size={24} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-white truncate">{alum.name}</h3>
                        <p className="text-primary text-[10px] font-mono uppercase tracking-widest truncate">{alum.role_title || 'Alumni'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-500 flex items-center gap-1"><Calendar size={10} /> {alum.session}</span>
                        </div>
                      </div>
                    </div>
                    
                    {alum.bio && (
                      <p className="text-gray-400 text-xs line-clamp-2 italic mb-4 leading-relaxed">
                        "{alum.bio}"
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 pt-4 border-t border-gray-800/50">
                      <button
                        onClick={() => handleEdit(alum)}
                        className="flex-1 py-1.5 bg-gray-800 hover:bg-primary hover:text-background text-gray-400 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(alum.id)}
                        className="p-1.5 bg-gray-800 hover:bg-red-500/10 text-gray-600 hover:text-error rounded-lg transition-all"
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
