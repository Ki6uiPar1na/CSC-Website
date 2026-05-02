'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Trophy, Users, User, Calendar, DollarSign, Trash2, Edit2, Plus, X, Save, Upload, Loader2, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { AdminPageHeader } from '@/components/AdminPageHeader';
import { compressImage } from "@/lib/image-utils";

interface Achievement {
  id: number;
  competition_name: string;
  team_name?: string;
  team_members?: string;
  is_team_contest: boolean;
  position?: number;
  prize_money?: number;
  description?: string;
  gallery_images?: string;
  achievement_date?: string;
}

export default function AchievementsAdmin() {
  const { data: session } = useSession();
  const router = useRouter();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [formData, setFormData] = useState({
    competition_name: '',
    team_name: '',
    team_members: '',
    is_team_contest: true,
    position: '',
    prize_money: '',
    description: '',
    gallery_images: '[]',
    achievement_date: '',
  });

  const [isCompressing, setIsCompressing] = useState(false);

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
    fetchAchievements();
  }, [session, router]);

  const fetchAchievements = async () => {
    try {
      const res = await fetch('/api/admin/achievements');
      const data = await res.json();
      setAchievements(data.achievements || []);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      setAchievements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingId ? `/api/admin/achievements/${editingId}` : '/api/admin/achievements';
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          position: formData.position ? parseInt(formData.position) : null,
          prize_money: formData.prize_money ? parseInt(formData.prize_money) : null,
          is_team_contest: formData.is_team_contest ? 1 : 0
        }),
      });
      
      if (res.ok) {
        resetForm();
        fetchAchievements();
      }
    } catch (error) {
      console.error('Error saving achievement:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      competition_name: '',
      team_name: '',
      team_members: '',
      is_team_contest: true,
      position: '',
      prize_money: '',
      description: '',
      gallery_images: '[]',
      achievement_date: '',
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsCompressing(true);
      const currentGallery = JSON.parse(formData.gallery_images || "[]");
      const newImages = [];
      for (let i = 0; i < files.length; i++) {
        const base64 = await compressImage(files[i], 1.5, 1.0);
        newImages.push(base64);
      }
      setFormData({ ...formData, gallery_images: JSON.stringify([...currentGallery, ...newImages]) });
    } catch (error: any) {
      alert(error.message || "Error compressing image");
    } finally {
      setIsCompressing(false);
    }
  };

  const removeGalleryImage = (index: number) => {
    const currentGallery = JSON.parse(formData.gallery_images || "[]");
    const updatedGallery = currentGallery.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, gallery_images: JSON.stringify(updatedGallery) });
  };

  const handleEdit = (achievement: Achievement) => {
    setFormData({
      competition_name: achievement.competition_name,
      team_name: achievement.team_name || '',
      team_members: achievement.team_members || '',
      is_team_contest: Boolean(achievement.is_team_contest),
      position: achievement.position?.toString() || '',
      prize_money: achievement.prize_money?.toString() || '',
      description: achievement.description || '',
      gallery_images: achievement.gallery_images || '[]',
      achievement_date: achievement.achievement_date ? new Date(achievement.achievement_date).toISOString().split('T')[0] : '',
    });
    setEditingId(achievement.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this achievement?')) return;
    
    try {
      const res = await fetch(`/api/admin/achievements/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAchievements();
      }
    } catch (error) {
      console.error('Error deleting achievement:', error);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader 
        title="Manage achievements" 
        icon={<Trophy className="text-primary" />} 
      />

      <div className="flex justify-end">
        <button
          onClick={() => {
            if (showForm) resetForm();
            else setShowForm(true);
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? 'Cancel' : 'Add Achievement'}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-gray-900/50 p-4 rounded-xl border border-gray-800 backdrop-blur-sm">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Search achievements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-primary outline-none transition-all"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="text-sm text-gray-500 font-mono">
          {achievements.filter(a => {
            const q = searchQuery.toLowerCase();
            return a.competition_name.toLowerCase().includes(q) || 
                   (a.team_name && a.team_name.toLowerCase().includes(q)) ||
                   (a.team_members && a.team_members.toLowerCase().includes(q));
          }).length} RESULTS
        </div>
      </div>

      {showForm && (
        <div className="card bg-gray-900/50 border-primary/20 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            {editingId ? <Edit2 size={20} className="text-primary" /> : <Plus size={20} className="text-primary" />}
            {editingId ? 'Edit Achievement' : 'New Achievement'}
          </h3>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Competition Name</label>
              <input
                type="text"
                required
                value={formData.competition_name}
                onChange={(e) => setFormData({ ...formData, competition_name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="e.g. National CTF Championship 2025"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Team Name (Optional)</label>
              <input
                type="text"
                value={formData.team_name}
                onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="e.g. JKKNIU Elite Squad"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Achievement Date</label>
              <input
                type="date"
                value={formData.achievement_date}
                onChange={(e) => setFormData({ ...formData, achievement_date: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Position (Optional)</label>
              <input
                type="number"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="e.g. 1"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Prize Money (Optional)</label>
              <input
                type="number"
                value={formData.prize_money}
                onChange={(e) => setFormData({ ...formData, prize_money: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="e.g. 50000"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center gap-4 mb-2">
                <label className="text-sm font-medium text-gray-400">Contest Type:</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.is_team_contest}
                    onChange={() => setFormData({ ...formData, is_team_contest: true })}
                    className="text-primary focus:ring-primary"
                  />
                  <span>Team</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!formData.is_team_contest}
                    onChange={() => setFormData({ ...formData, is_team_contest: false })}
                    className="text-primary focus:ring-primary"
                  />
                  <span>Solo</span>
                </label>
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-400">Team Members / Solo Winner</label>
              <textarea
                value={formData.team_members}
                onChange={(e) => setFormData({ ...formData, team_members: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary outline-none transition-all h-20"
                placeholder="e.g. Member 1, Member 2, Member 3"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-400">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary outline-none transition-all h-32"
                placeholder="Provide some details about the achievement..."
              />
            </div>

            {/* Gallery Section */}
            <div className="md:col-span-2 pt-4 border-t border-gray-800">
              <label className="block text-sm font-medium mb-2 uppercase tracking-wider font-mono text-accent">Achievement Gallery Images</label>
              <div className="space-y-4">
                <label className="block w-full cursor-pointer group">
                  <div className="border-2 border-dashed border-gray-800 group-hover:border-accent/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all">
                    {isCompressing ? <Loader2 className="animate-spin text-accent" size={32} /> : <ImageIcon className="text-gray-600 group-hover:text-accent" size={32} />}
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">
                      {isCompressing ? "Compressing images..." : "Click to add photos from the event"}
                    </p>
                  </div>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} disabled={isCompressing} />
                </label>

                {JSON.parse(formData.gallery_images || "[]").length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
                    {JSON.parse(formData.gallery_images || "[]").map((img: string, idx: number) => (
                      <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-800">
                        <img src={img} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end gap-4 mt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 border border-gray-700 rounded-lg hover:bg-gray-800 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary px-8 py-3 flex items-center gap-2"
              >
                <Save size={18} />
                {editingId ? 'Update Achievement' : 'Save Achievement'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {achievements.length === 0 ? (
          <div className="text-center py-20 bg-gray-900/30 border border-dashed border-gray-700 rounded-xl">
            <Trophy size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No achievements added yet.</p>
          </div>
        ) : (
          achievements
            .filter(a => {
              const q = searchQuery.toLowerCase();
              return a.competition_name.toLowerCase().includes(q) || 
                     (a.team_name && a.team_name.toLowerCase().includes(q)) ||
                     (a.team_members && a.team_members.toLowerCase().includes(q)) ||
                     (a.description && a.description.toLowerCase().includes(q));
            })
            .sort((a, b) => {
              // Primary sort: Date (newest first)
              const dateA = a.achievement_date ? new Date(a.achievement_date).getTime() : 0;
              const dateB = b.achievement_date ? new Date(b.achievement_date).getTime() : 0;
              if (dateB !== dateA) return dateB - dateA;
              
              // Secondary sort: Position (ascending)
              if (a.position === undefined || a.position === null) return 1;
              if (b.position === undefined || b.position === null) return -1;
              return a.position - b.position;
            })
            .map((achievement) => (
            <div key={achievement.id} className="card bg-gray-900/40 border-gray-800 hover:border-primary/30 transition-all group">
              <div className="flex flex-col md:flex-row justify-between gap-6 overflow-hidden">
                <div className="flex-1 space-y-4 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xl font-bold text-white group-hover:text-primary transition-colors break-words">
                        {achievement.competition_name}
                      </h4>
                    </div>
                    {achievement.position && (
                      <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-bold border border-primary/20">
                        #{achievement.position} Position
                      </div>
                    )}
                  </div>

                  {achievement.gallery_images && JSON.parse(achievement.gallery_images).length > 0 && (
                    <div className="flex items-center gap-2 text-[10px] text-accent font-bold uppercase tracking-widest bg-accent/5 w-fit px-2 py-1 rounded border border-accent/10">
                      <ImageIcon size={12} />
                      {JSON.parse(achievement.gallery_images).length} Gallery Images
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar size={16} className="text-primary" />
                      {achievement.achievement_date ? new Date(achievement.achievement_date).toLocaleDateString() : 'N/A'}
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      {achievement.is_team_contest ? <Users size={16} className="text-primary" /> : <User size={16} className="text-primary" />}
                      {achievement.is_team_contest ? (achievement.team_name || 'Team Contest') : 'Solo Contest'}
                    </div>
                    {achievement.prize_money && (
                      <div className="flex items-center gap-2 text-green-400 font-semibold">
                        <DollarSign size={16} />
                        {achievement.prize_money.toLocaleString()} TK
                      </div>
                    )}
                  </div>

                  {achievement.team_members && (
                    <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50 overflow-hidden">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Members</p>
                      <p className="text-sm text-gray-300 break-all">{achievement.team_members}</p>
                    </div>
                  )}

                    {achievement.description && (
                      <p className="text-sm text-gray-400 italic whitespace-pre-wrap break-all overflow-hidden">
                        "{achievement.description}"
                      </p>
                    )}
                </div>

                <div className="flex md:flex-col gap-2 justify-end">
                  <button
                    onClick={() => handleEdit(achievement)}
                    className="p-3 bg-blue-600/10 text-blue-500 rounded-lg hover:bg-blue-600 hover:text-white transition-all border border-blue-500/20"
                    title="Edit"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(achievement.id)}
                    className="p-3 bg-red-600/10 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all border border-red-500/20"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
