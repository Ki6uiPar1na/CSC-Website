"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Calendar, MapPin, Link as LinkIcon, Users, Copy, Share2, Loader, Image as ImageIcon, X, Check, HelpCircle, Star, AlertCircle } from "lucide-react";

interface EventData {
  id: number;
  title: string;
  description: string;
  type: string;
  event_type: "online" | "offline" | "hybrid";
  event_date: string;
  event_time: string;
  location?: string;
  platform_name?: string;
  meeting_link?: string;
  capacity?: number;
  registered_count: number;
  is_premium: boolean;
  target_audience?: string;
  photo_url?: string;
  gallery_images?: string;
  is_active: boolean;
  slug: string;
  event_code: string;
  created_at: string;
  updated_at: string;
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  
  const [event, setEvent] = useState<EventData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(null);
  const [isRsvpLoading, setIsRsvpLoading] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchEvent();
    }
  }, [slug]);

  useEffect(() => {
    if (event) {
      fetchRsvpStatus();
    }
  }, [event]);

  const fetchRsvpStatus = async () => {
    try {
      const res = await fetch(`/api/events/rsvp?eventId=${event?.id}`);
      const data = await res.json();
      setRsvpStatus(data.rsvpStatus);
    } catch (err) {
      console.error("Error fetching RSVP status:", err);
    }
  };

  const handleRSVP = async (status: string | null) => {
    setIsRsvpLoading(true);
    try {
      const res = await fetch("/api/events/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event?.id, status }),
      });
      const data = await res.json();
      if (res.ok) {
        setRsvpStatus(status);
        if (event) {
          setEvent({ ...event, registered_count: data.registered_count });
        }
      }
    } catch (err) {
      console.error("Error RSVPing:", err);
    } finally {
      setIsRsvpLoading(false);
    }
  };

  const fetchEvent = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/events/${slug}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Event not found");
        } else {
          setError("Failed to load event");
        }
        return;
      }
      const data = await response.json();
      setEvent(data.event);
    } catch (err) {
      console.error("Error fetching event:", err);
      setError("Failed to load event details");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getShareUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/events/${slug}`;
    }
    return "";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Loader className="animate-spin mx-auto mb-4" size={32} />
            <p className="text-primary font-mono">Loading event...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="card bg-error/10 border border-error/30 p-8 text-center">
            <h1 className="text-2xl font-bold text-error mb-2">Event Not Found</h1>
            <p className="text-gray-400 mb-6">{error || "This event could not be loaded."}</p>
            <button
              onClick={() => router.push("/events")}
              className="primary px-6 py-2 font-mono"
            >
              Back to Events
            </button>
          </div>
        </div>
      </div>
    );
  }

  const eventDate = new Date(event.event_date);
  const formattedDate = eventDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const shareUrl = getShareUrl();

  return (
    <div className="min-h-screen bg-black">
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Event Banner / Photo */}
        {(event.photo_url || (event.gallery_images && JSON.parse(event.gallery_images).length > 0)) && (
          <div 
            className="mb-8 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl shadow-primary/10 cursor-zoom-in"
            onClick={() => setSelectedImage(event.photo_url || JSON.parse(event.gallery_images!)[0])}
          >
            <img 
              src={event.photo_url || JSON.parse(event.gallery_images!)[0]} 
              alt={event.title} 
              className="w-full h-auto max-h-[400px] object-cover hover:scale-105 transition-transform duration-700" 
            />
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4 gap-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{event.title}</h1>
              <div className="flex gap-2 flex-wrap">
                {event.target_audience && event.target_audience !== 'all' && (
                  <span className="badge bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase text-[10px] tracking-widest font-bold">
                    {event.target_audience}
                  </span>
                )}
                {event.is_premium && (
                  <span className="badge bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    Premium
                  </span>
                )}
                <span className="badge bg-primary/20 text-primary border border-primary/30 capitalize">
                  {event.event_type}
                </span>
                {event.type && (
                  <span className="badge bg-accent/20 text-accent border border-accent/30">
                    {event.type}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Event Details */}
          <div className="lg:col-span-2">
            <div className="card mb-6">
              <h2 className="text-xl font-bold mb-4">About This Event</h2>
              <p className="text-gray-400 whitespace-pre-wrap">{event.description}</p>
            </div>

            {/* Event Information */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Event Details</h2>
              <div className="space-y-4">
                {/* Date & Time */}
                <div className="flex gap-3">
                  <Calendar size={20} className="text-primary flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-gray-400 text-sm">Date & Time</p>
                    <p className="font-mono">
                      {formattedDate} at {event.event_time}
                    </p>
                  </div>
                </div>

                {/* Location or Platform */}
                {event.event_type === "online" && event.platform_name ? (
                  <div className="flex gap-3">
                    <LinkIcon size={20} className="text-accent flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-gray-400 text-sm">Platform</p>
                      <p className="font-mono mb-2">{event.platform_name}</p>
                      {event.meeting_link && (
                        <a
                          href={event.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 underline text-sm break-all"
                        >
                          {event.meeting_link}
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  event.location && (
                    <div className="flex gap-3">
                      <MapPin size={20} className="text-accent flex-shrink-0 mt-1" />
                      <div>
                        <p className="text-gray-400 text-sm">Location</p>
                        <p className="font-mono">{event.location}</p>
                      </div>
                    </div>
                  )
                )}

                {/* Capacity */}
                {event.capacity && (
                  <div className="flex gap-3">
                    <Users size={20} className="text-accent flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-gray-400 text-sm">Capacity</p>
                      <p className="font-mono">
                        {event.registered_count} / {event.capacity} registered
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* RSVP Card */}
            {(() => {
              const eventDate = new Date(event.event_date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isFinished = eventDate < today;

              if (isFinished) {
                return (
                  <div className="card border-gray-800 bg-gray-900/50 opacity-80">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-500">
                      <AlertCircle size={20} />
                      Registration Closed
                    </h3>
                    <p className="text-sm text-gray-400 mb-4">
                      This event has already taken place or registration has been closed.
                    </p>
                    <div className="p-3 bg-black/40 border border-gray-800 rounded-lg text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Event Completed</p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="card border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Star className="text-primary" size={20} />
                    RSVP Now
                  </h3>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => handleRSVP(rsvpStatus === 'going' ? null : 'going')}
                      disabled={isRsvpLoading || (event.capacity && event.registered_count >= event.capacity && rsvpStatus !== 'going')}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                        rsvpStatus === 'going' 
                          ? 'bg-primary text-black border-primary font-bold' 
                          : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-primary/50'
                      } ${isRsvpLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <Check size={18} />
                        <span>Going</span>
                      </div>
                      {rsvpStatus === 'going' && <span className="text-[10px] uppercase tracking-tighter">Selected</span>}
                    </button>

                    <button
                      onClick={() => handleRSVP(rsvpStatus === 'maybe' ? null : 'maybe')}
                      disabled={isRsvpLoading}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                        rsvpStatus === 'maybe' 
                          ? 'bg-accent text-black border-accent font-bold' 
                          : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-accent/50'
                      } ${isRsvpLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <HelpCircle size={18} />
                        <span>Maybe</span>
                      </div>
                      {rsvpStatus === 'maybe' && <span className="text-[10px] uppercase tracking-tighter">Selected</span>}
                    </button>

                    <button
                      onClick={() => handleRSVP(rsvpStatus === 'interested' ? null : 'interested')}
                      disabled={isRsvpLoading}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                        rsvpStatus === 'interested' 
                          ? 'bg-blue-600 text-white border-blue-600 font-bold' 
                          : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-blue-600/50'
                      } ${isRsvpLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <Star size={18} />
                        <span>Interested</span>
                      </div>
                      {rsvpStatus === 'interested' && <span className="text-[10px] uppercase tracking-tighter">Selected</span>}
                    </button>
                  </div>

                  {event.capacity && (
                    <div className="mt-4 pt-4 border-t border-gray-800">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-gray-500 uppercase tracking-widest font-bold">Capacity</span>
                        <span className={event.registered_count >= event.capacity ? "text-red-500 font-bold" : "text-primary font-bold"}>
                          {event.registered_count} / {event.capacity}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${event.registered_count >= event.capacity ? "bg-red-500" : "bg-primary"}`}
                          style={{ width: `${Math.min(100, (event.registered_count / event.capacity) * 100)}%` }}
                        ></div>
                      </div>
                      {event.registered_count >= event.capacity && (
                        <p className="text-[10px] text-red-500 mt-2 text-center uppercase font-bold animate-pulse">Event is Full</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="card">
              <h3 className="text-lg font-bold mb-4">Share This Event</h3>
              <p className="text-sm text-gray-400 mb-6 italic">Invite your friends and peers to join this event!</p>
              
              <button
                onClick={() => copyToClipboard(shareUrl)}
                className="w-full flex items-center justify-center gap-3 bg-primary text-black font-bold py-3 rounded-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
              >
                <Share2 size={20} />
                {copied ? "Link Copied!" : "Share Event"}
              </button>
            </div>
          </div>
        </div>

        {/* Gallery Section */}
        {event.gallery_images && JSON.parse(event.gallery_images).length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-1 bg-accent rounded-full"></div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <ImageIcon className="text-accent" />
                Event Gallery
              </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {JSON.parse(event.gallery_images).map((img: string, idx: number) => (
                <div 
                  key={idx} 
                  onClick={() => setSelectedImage(img)}
                  className="group relative aspect-video rounded-2xl overflow-hidden border border-gray-800 hover:border-accent/30 transition-all cursor-zoom-in"
                >
                  <img src={img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lightbox Modal */}
        {selectedImage && (
          <div 
            className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
            onClick={() => setSelectedImage(null)}
          >
            <button 
              className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
              onClick={() => setSelectedImage(null)}
            >
              <X size={32} />
            </button>
            <div className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center">
              <img 
                src={selectedImage} 
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl shadow-primary/20 animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8">
          <button
            onClick={() => router.push("/events")}
            className="text-primary hover:text-primary/80 font-mono text-sm uppercase"
          >
            ← Back to Events
          </button>
        </div>
      </div>
    </div>
  );
}
