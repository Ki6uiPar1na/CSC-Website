"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Plus, Edit2, Trash2, Loader2, AlertCircle, Calendar as CalendarIcon, 
  MapPin, Users, Upload, X, CheckCircle, Save, Image as ImageIcon, 
  Search, Filter, ExternalLink, Clock, Lock, Globe, Camera,
  Trophy, RefreshCw
} from "lucide-react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { useMessage, useLoading } from "@/lib/admin-hooks";
import { Event } from "@/lib/admin-types";
import { formatDate } from "@/lib/admin-utils";
import { compressImage } from "@/lib/image-utils";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "workshop",
    event_type: "online" as "online" | "offline" | "hybrid",
    event_date: "",
    event_time: "10:00",
    location: "",
    platform_name: "",
    meeting_link: "",
    capacity: 100,
    is_premium: false,
    target_audience: "all" as "free" | "premium" | "all",
    photo_url: "",
    gallery_images: "[]",
    exclusivity_expires_at: "",
    is_active: true,
    convert_to_contest: false,
  });

  const { loading: fetchLoading, setLoading: setFetchLoading } = useLoading(true);
  const { loading: actionLoading, setLoading: setActionLoading } = useLoading();
  const { loading: formLoading, setLoading: setFormLoading } = useLoading();
  const { loading: convertLoading, setLoading: setConvertLoading } = useLoading();
  const { message, showMessage } = useMessage();

  useEffect(() => {
    fetchEventsData();
  }, []);

  useEffect(() => {
    let result = events;
    
    if (searchQuery) {
      result = result.filter(e => 
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (filterType !== "all") {
      if (filterType === "active") result = result.filter(e => e.is_active);
      if (filterType === "premium") result = result.filter(e => e.is_premium);
      if (filterType === "online") result = result.filter(e => e.event_type === "online");
      if (filterType === "offline") result = result.filter(e => e.event_type === "offline");
    }
    
    setFilteredEvents(result);
  }, [searchQuery, filterType, events]);

  const fetchEventsData = async () => {
    setFetchLoading(true);
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      setEvents(data.events || []);
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setFetchLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      type: "workshop",
      event_type: "online",
      event_date: "",
      event_time: "10:00",
      location: "",
      platform_name: "",
      meeting_link: "",
      capacity: 100,
      is_premium: false,
      target_audience: "all",
      photo_url: "",
      gallery_images: "[]",
      exclusivity_expires_at: "",
      is_active: true,
      convert_to_contest: false,
    });
    setEditingEvent(null);
    setShowForm(false);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'poster' | 'gallery') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsCompressing(true);
      if (type === 'poster') {
        const base64 = await compressImage(files[0], 1.5, 1.0);
        setFormData({ ...formData, photo_url: base64 });
      } else {
        const currentGallery = JSON.parse(formData.gallery_images || "[]");
        const newImages = [];
        for (let i = 0; i < files.length; i++) {
          const base64 = await compressImage(files[i], 1.5, 1.0);
          newImages.push(base64);
        }
        setFormData({ ...formData, gallery_images: JSON.stringify([...currentGallery, ...newImages]) });
      }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.event_date) {
      showMessage("error", "Title and date are required");
      return;
    }

    setFormLoading(true);
    try {
      const url = editingEvent ? `/api/admin/events/${editingEvent.id}` : "/api/admin/events";
      const method = editingEvent ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, convert_to_contest: formData.convert_to_contest }),
      });

      if (!res.ok) throw new Error("Failed to save event");
      showMessage("success", editingEvent ? "Event updated" : "Event created");
      resetForm();
      fetchEventsData();
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      type: event.type || "workshop",
      event_type: event.event_type,
      event_date: event.event_date ? new Date(event.event_date).toISOString().split('T')[0] : "",
      event_time: event.event_time,
      location: event.location || "",
      platform_name: event.platform_name || "",
      meeting_link: event.meeting_link || "",
      capacity: event.capacity || 100,
      is_premium: !!event.is_premium,
      target_audience: event.target_audience || "all",
      photo_url: event.photo_url || "",
      gallery_images: event.gallery_images || "[]",
      exclusivity_expires_at: event.exclusivity_expires_at ? new Date(event.exclusivity_expires_at).toISOString().split('T')[0] : "",
      is_active: !!event.is_active,
      convert_to_contest: !!event.convert_to_contest,
    });
    setShowForm(true);
  };

  const handleDelete = async (event: Event) => {
    if (!confirm(`Delete "${event.title}"?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      showMessage("success", "Event deleted");
      fetchEventsData();
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToContest = async (event: Event) => {
    if (!confirm(`Convert "${event.title}" to contest and competition achievement?\n\nThis will create entries in the Contests and Competition Achievements tables.`)) return;
    setConvertLoading(true);
    try {
      const res = await fetch("/api/admin/events/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: event.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to convert");
      showMessage("success", `"${event.title}" converted to contest successfully`);
      fetchEventsData();
    } catch (error: any) {
      showMessage("error", error.message);
    } finally {
      setConvertLoading(false);
    }
  };

  const isEventFinished = (date: string) => {
    const eventDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <AdminPageHeader
        title="Event Management"
        icon={<CalendarIcon className="text-primary" />}
        count={events.length}
        actionButton={{
          label: "New Event",
          onClick: () => {
            resetForm();
            setShowForm(true);
          },
        }}
        message={message}
      />

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-gray-900/40 border-gray-800 p-4">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Total Events</p>
          <p className="text-2xl font-bold">{events.length}</p>
        </div>
        <div className="card bg-gray-900/40 border-gray-800 p-4">
          <p className="text-[10px] uppercase tracking-widest text-green-500 font-bold mb-1">Active</p>
          <p className="text-2xl font-bold text-green-400">{events.filter(e => e.is_active).length}</p>
        </div>
        <div className="card bg-gray-900/40 border-gray-800 p-4">
          <p className="text-[10px] uppercase tracking-widest text-yellow-500 font-bold mb-1">Premium</p>
          <p className="text-2xl font-bold text-yellow-400">{events.filter(e => e.is_premium).length}</p>
        </div>
        <div className="card bg-gray-900/40 border-gray-800 p-4">
          <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-1">Upcoming</p>
          <p className="text-2xl font-bold text-primary">{events.filter(e => !isEventFinished(e.event_date)).length}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-900/30 p-4 rounded-xl border border-gray-800">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text"
            placeholder="Search events by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full pl-10 h-10 text-sm"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input h-10 text-xs font-bold uppercase tracking-wider bg-black/40"
          >
            <option value="all">All Events</option>
            <option value="active">Active Only</option>
            <option value="premium">Premium Only</option>
            <option value="online">Online Only</option>
            <option value="offline">Offline Only</option>
          </select>
        </div>
      </div>

      {fetchLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="animate-spin text-primary" size={40} />
          <p className="text-gray-400 animate-pulse">Synchronizing event data...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="card text-center py-20 bg-gray-900/20 border-dashed border-2 border-gray-800">
          <CalendarIcon size={48} className="mx-auto mb-4 text-gray-700" />
          <h3 className="text-xl font-bold text-gray-400">No Events Found</h3>
          <p className="text-gray-600 text-sm mt-2">Adjust your filters or create a new event to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredEvents.map((event) => {
            const finished = isEventFinished(event.event_date);
            const galleryCount = JSON.parse(event.gallery_images || "[]").length;

            return (
              <div 
                key={event.id} 
                className={`group card relative overflow-hidden transition-all duration-300 hover:border-primary/40 ${
                  finished ? 'opacity-75 grayscale-[0.3]' : ''
                }`}
              >
                {/* Background Decor */}
                <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl opacity-20 ${
                  finished ? 'bg-gray-500' : 'bg-primary'
                }`}></div>

                <div className="flex flex-col sm:flex-row gap-6 relative z-10">
                  {/* Poster Thumbnail */}
                  <div className="w-full sm:w-32 h-32 rounded-xl overflow-hidden border border-gray-800 shrink-0 bg-black/40 relative">
                    {event.photo_url ? (
                      <img src={event.photo_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-700">
                        <ImageIcon size={32} />
                      </div>
                    )}
                    {finished && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-white uppercase tracking-tighter border border-white/30 px-1 py-0.5 rounded">Completed</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{event.title}</h3>
                          {!event.is_active && (
                            <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] px-1.5 py-0.5 rounded uppercase font-bold">Draft</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-1 italic">{event.description}</p>
                      </div>
                      
                      <div className="flex gap-2 shrink-0">
                        <Link
                          href={`/admin/events/${event.id}/rsvps`}
                          className="p-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all border border-blue-600/20"
                          title="RSVP Records"
                        >
                          <Users size={16} />
                        </Link>
                        <button
                          onClick={() => handleEdit(event)}
                          className="p-2 bg-gray-800 text-gray-300 hover:bg-primary hover:text-black rounded-lg transition-all border border-gray-700"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(event)}
                          className="p-2 bg-gray-800 text-gray-300 hover:bg-red-500 hover:text-white rounded-lg transition-all border border-gray-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <Clock size={12} className="text-primary" />
                        <span>{formatDate(event.event_date)} at {event.event_time}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <Users size={12} className="text-primary" />
                        <span className="font-bold text-white">{event.registered_count}</span>
                        <span className="opacity-50">/ {event.capacity} RSVPs</span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        {event.event_type === 'online' ? <Globe size={12} className="text-blue-400" /> : <MapPin size={12} className="text-accent" />}
                        <span className="capitalize">{event.event_type} {event.platform_name && `(${event.platform_name})`}</span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <Camera size={12} className="text-purple-400" />
                        <span>{galleryCount} Gallery Items</span>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="text-[9px] px-2 py-0.5 bg-black/40 border border-gray-700 rounded-full text-gray-400 uppercase font-bold tracking-widest">
                        {event.type}
                      </span>
                      <span className={`text-[9px] px-2 py-0.5 border rounded-full uppercase font-bold tracking-widest ${
                        event.target_audience === 'premium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                        event.target_audience === 'free' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-gray-800 text-gray-400 border-gray-700'
                      }`}>
                        Audience: {event.target_audience}
                      </span>
                      {event.is_premium && (
                        <span className="text-[9px] px-2 py-0.5 bg-yellow-500 text-black rounded-full uppercase font-bold tracking-widest flex items-center gap-1 shadow-lg shadow-yellow-500/10">
                          <Lock size={8} /> Premium
                        </span>
                      )}
                      {event.event_code && (
                        <span className="text-[9px] px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full font-mono font-bold">
                          {event.event_code}
                        </span>
                      )}
                      {event.convert_to_contest && !event.is_converted && !finished && (
                        <span className="text-[9px] px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full uppercase font-bold tracking-widest flex items-center gap-1">
                          <Trophy size={8} /> Auto-Convert Pending
                        </span>
                      )}
                      {event.convert_to_contest && !event.is_converted && finished && (
                        <span className="text-[9px] px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full uppercase font-bold tracking-widest flex items-center gap-1">
                          <RefreshCw size={8} /> Ready to Convert
                        </span>
                      )}
                      {event.is_converted && (
                        <span className="text-[9px] px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full uppercase font-bold tracking-widest flex items-center gap-1">
                          <Trophy size={8} /> Converted
                        </span>
                      )}
                    </div>

                    {event.convert_to_contest && !event.is_converted && finished && (
                      <div className="pt-2">
                        <button
                          onClick={() => handleConvertToContest(event)}
                          disabled={convertLoading}
                          className="w-full py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                        >
                          {convertLoading ? <Loader2 size={12} className="animate-spin" /> : <Trophy size={12} />}
                          Convert to Contest & Achievement
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="card w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col shadow-[0_0_50px_-12px_rgba(var(--color-primary),0.3)] border-primary/20 scale-in-center">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-900/50">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    {editingEvent ? <Edit2 className="text-primary" size={20} /> : <Plus className="text-primary" size={20} />}
                  </div>
                  {editingEvent ? "Refine Event" : "Create Masterpiece"}
                </h2>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Configure your club event parameters</p>
              </div>
              <button onClick={resetForm} className="p-2 hover:bg-gray-800 rounded-full transition-all text-gray-500 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Basic Info */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-[0.2em] border-b border-primary/20 pb-2">Fundamental Details</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Event Title</label>
                        <input
                          type="text"
                          required
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Cybersecurity Workshop 2026"
                          className="input w-full bg-black/40 focus:bg-black/60"
                          disabled={formLoading}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Description</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Comprehensive deep-dive into network security..."
                          className="input w-full min-h-[120px] bg-black/40 focus:bg-black/60 py-3"
                          disabled={formLoading}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-accent uppercase tracking-[0.2em] border-b border-accent/20 pb-2">Scheduling</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Date</label>
                          <input
                            type="date"
                            required
                            value={formData.event_date}
                            onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                            className="input w-full bg-black/40 h-10 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Time</label>
                          <input
                            type="time"
                            value={formData.event_time}
                            onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                            className="input w-full bg-black/40 h-10 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-purple-400 uppercase tracking-[0.2em] border-b border-purple-400/20 pb-2">Logistics</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Format</label>
                          <select
                            value={formData.event_type}
                            onChange={(e) => setFormData({ ...formData, event_type: e.target.value as any })}
                            className="input w-full bg-black/40 h-10 text-sm"
                          >
                            <option value="online">Online</option>
                            <option value="offline">Offline</option>
                            <option value="hybrid">Hybrid</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Capacity</label>
                          <input
                            type="number"
                            value={formData.capacity}
                            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                            className="input w-full bg-black/40 h-10 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Location/Link Inputs */}
                  {(formData.event_type === 'offline' || formData.event_type === 'hybrid') && (
                    <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl animate-in slide-in-from-top-2">
                      <label className="block text-[10px] font-bold text-accent uppercase mb-2">Venue Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-accent" size={16} />
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          placeholder="Building 3, Room 402..."
                          className="input w-full pl-10 h-10 bg-black/40 text-sm border-accent/20 focus:border-accent"
                        />
                      </div>
                    </div>
                  )}

                  {(formData.event_type === 'online' || formData.event_type === 'hybrid') && (
                    <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl animate-in slide-in-from-top-2 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-blue-400 uppercase mb-2">Platform</label>
                          <input
                            type="text"
                            value={formData.platform_name}
                            onChange={(e) => setFormData({ ...formData, platform_name: e.target.value })}
                            placeholder="Zoom, Google Meet..."
                            className="input w-full h-10 bg-black/40 text-sm border-blue-500/20 focus:border-blue-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-blue-400 uppercase mb-2">Access Link</label>
                          <input
                            type="url"
                            value={formData.meeting_link}
                            onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                            placeholder="https://..."
                            className="input w-full h-10 bg-black/40 text-xs font-mono border-blue-500/20 focus:border-blue-400"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Media & Settings */}
                <div className="space-y-6">
                  {/* Poster Upload */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-[0.2em] border-b border-primary/20 pb-2">Main Identity</h4>
                    <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-dashed border-gray-800 bg-black/40 group hover:border-primary/50 transition-all">
                      {formData.photo_url ? (
                        <img src={formData.photo_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 gap-2">
                          <ImageIcon size={40} />
                          <p className="text-[10px] font-bold uppercase">Upload Poster</p>
                        </div>
                      )}
                      <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-all">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, 'poster')} />
                        <div className="bg-white text-black px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2">
                          {isCompressing ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                          {formData.photo_url ? "Replace" : "Upload"}
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Settings */}
                  <div className="space-y-4 pt-4 border-t border-gray-800">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-800 pb-2">Visibility & Status</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                        <div className="flex items-center gap-3">
                          <CheckCircle size={16} className={formData.is_active ? "text-green-500" : "text-gray-600"} />
                          <span className="text-xs font-bold text-gray-300">Live Status</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                          className={`w-10 h-5 rounded-full transition-all relative ${formData.is_active ? 'bg-green-500' : 'bg-gray-700'}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.is_active ? 'right-1' : 'left-1'}`}></div>
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                        <div className="flex items-center gap-3">
                          <Lock size={16} className={formData.is_premium ? "text-yellow-500" : "text-gray-600"} />
                          <span className="text-xs font-bold text-gray-300">Premium Event</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setFormData({ ...formData, is_premium: !formData.is_premium })}
                          className={`w-10 h-5 rounded-full transition-all relative ${formData.is_premium ? 'bg-yellow-500' : 'bg-gray-700'}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.is_premium ? 'right-1' : 'left-1'}`}></div>
                        </button>
                      </div>

                      {formData.is_premium && (
                        <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl animate-in slide-in-from-top-2">
                          <label className="block text-[10px] font-bold text-yellow-500 uppercase mb-2">Exclusivity Expires</label>
                          <input
                            type="date"
                            value={formData.exclusivity_expires_at}
                            onChange={(e) => setFormData({ ...formData, exclusivity_expires_at: e.target.value })}
                            className="input w-full h-8 text-xs bg-black/40 border-yellow-500/20"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                        <div className="flex items-center gap-3">
                          <Trophy size={16} className={formData.convert_to_contest ? "text-orange-500" : "text-gray-600"} />
                          <span className="text-xs font-bold text-gray-300">Convert to Contest After Event Ends</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setFormData({ ...formData, convert_to_contest: !formData.convert_to_contest })}
                          className={`w-10 h-5 rounded-full transition-all relative ${formData.convert_to_contest ? 'bg-orange-500' : 'bg-gray-700'}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.convert_to_contest ? 'right-1' : 'left-1'}`}></div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gallery Section Full Width */}
              <div className="pt-8 border-t border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-accent uppercase tracking-[0.2em]">Post-Event Coverage Gallery</h4>
                  <span className="text-[10px] text-gray-500 uppercase font-bold">{JSON.parse(formData.gallery_images || "[]").length} Images Selected</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-800 hover:border-accent/50 hover:bg-accent/5 cursor-pointer flex flex-col items-center justify-center text-gray-600 transition-all gap-2 group">
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageChange(e, 'gallery')} />
                    <Plus size={24} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[8px] font-bold uppercase">Add Photos</span>
                  </label>

                  {JSON.parse(formData.gallery_images || "[]").map((img: string, idx: number) => (
                    <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-800 group shadow-lg">
                      <img src={img} className="w-full h-full object-cover" alt="" />
                      <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          type="button" 
                          onClick={() => removeGalleryImage(idx)}
                          className="p-2 bg-white text-red-500 rounded-full hover:scale-110 transition-transform"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-800 bg-gray-900/50 flex justify-end gap-4 items-center">
              <p className="text-[10px] text-gray-500 mr-auto uppercase font-bold tracking-tighter">Fields marked with * are required for synchronization</p>
              <button 
                type="button" 
                onClick={resetForm}
                className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={formLoading || isCompressing}
                className="px-8 py-3 bg-primary text-black font-bold uppercase text-xs tracking-widest rounded-xl flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {formLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingEvent ? "Sync Changes" : "Publish Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
