"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Link as LinkIcon, Users, Crown, Loader2, Copy, Share2, Search } from "lucide-react";
import { SearchBox } from "@/components/SearchBox";

interface Event {
  id: number;
  title: string;
  type: string;
  description: string;
  slug?: string;
  event_code?: string;
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
  rsvp_status?: string;
  created_at: string;
}

export default function EventsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [copiedEventId, setCopiedEventId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (status !== "loading") {
      fetchEvents();
    }
  }, [status, currentPage]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/events?page=${currentPage}&limit=15`, {
        cache: "no-store"
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }

      const data = await response.json();
      setEvents(Array.isArray(data.events) ? data.events : []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      setIsPremium(data.isPremium || false);
      
      // Show helpful message for non-premium users
      if (!data.isPremium && data.message) {
        setMessage(data.message);
      }
    } catch (err: any) {
      console.error("Error fetching events:", err);
      setError(err.message);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, eventId: number) => {
    navigator.clipboard.writeText(text);
    setCopiedEventId(eventId);
    setTimeout(() => setCopiedEventId(null), 2000);
  };

  const getEventShareUrl = (eventCode?: string) => {
    if (!eventCode) return "";
    if (typeof window !== "undefined") {
      return `${window.location.origin}/events/${eventCode}`;
    }
    return `/events/${eventCode}`;
  };

  const shareOnTwitter = (event: Event) => {
    const url = getEventShareUrl(event.event_code);
    const text = `Check out this event: ${event.title} 🎉`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank");
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-gray-400">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <main>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-4">
            <Calendar size={24} className="text-primary shrink-0" />
            <h1 className="text-2xl sm:text-4xl font-bold">Events</h1>
            {isPremium && (
              <span className="flex items-center gap-1 bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-semibold">
                <Crown size={14} />
                Premium
              </span>
            )}
          </div>
          <p className="text-gray-400">
            {isPremium
              ? "You have access to all premium and free events"
              : "Showing available events for your subscription level"}
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 max-w-md">
          <SearchBox 
            query={searchQuery}
            setQuery={setSearchQuery}
            placeholder="Search events by title or type..."
          />
        </div>

        {/* Message for non-premium users */}
        {message && (
          <div className="bg-blue-900/30 border border-blue-700 text-blue-200 px-4 py-3 rounded mb-6">
            <p className="text-sm">{message}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Events Grid */}
        {events.length > 0 ? (
          (() => {
            const filteredEvents = events.filter(event => {
              const query = searchQuery.toLowerCase();
              return event.title.toLowerCase().includes(query) || 
                     event.type.toLowerCase().includes(query) ||
                     (event.description && event.description.toLowerCase().includes(query)) ||
                     (event.location && event.location.toLowerCase().includes(query));
            });

            if (filteredEvents.length === 0) {
              return (
                <div className="text-center py-20 bg-gray-900/30 border border-dashed border-gray-800 rounded-3xl">
                  <Search size={48} className="mx-auto text-gray-700 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">No matches found</h3>
                  <p className="text-gray-500">Try adjusting your search terms or filters.</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => event.event_code && router.push(`/events/${event.event_code}`)}
                    className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden hover:border-primary/50 transition-all cursor-pointer group"
                  >
                    {/* Event Photo */}
                    {(event.photo_url || (event.gallery_images && JSON.parse(event.gallery_images).length > 0)) && (
                      <div className="w-full h-40 sm:h-48 overflow-hidden border-b border-gray-800">
                        <img 
                          src={event.photo_url || JSON.parse(event.gallery_images!)[0]} 
                          alt={event.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      </div>
                    )}

                    <div className="p-4 sm:p-6">
                      {/* Event Header */}
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl font-bold mb-2 group-hover:text-primary transition-colors break-words">{event.title}</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            {event.target_audience && event.target_audience !== 'all' && (
                              <span className="text-[10px] tracking-tighter bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 uppercase font-bold">
                                {event.target_audience}
                              </span>
                            )}
                            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                              {event.type}
                            </span>
                            {event.is_premium && (
                              <span className="flex items-center gap-1 bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-semibold">
                                <Crown size={12} />
                                PREMIUM
                              </span>
                            )}
                            {event.rsvp_status && (
                              <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${
                                event.rsvp_status === 'going' ? 'bg-primary/20 text-primary border-primary/30' :
                                event.rsvp_status === 'maybe' ? 'bg-accent/20 text-accent border-accent/30' :
                                'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              }`}>
                                {event.rsvp_status}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(getEventShareUrl(event.event_code), event.id);
                          }}
                          className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-primary"
                          title="Share Event"
                        >
                          {copiedEventId === event.id ? <span className="text-[10px] font-bold text-primary animate-in fade-in zoom-in duration-300">COPIED!</span> : <Share2 size={18} />}
                        </button>
                      </div>

                    {/* Description */}
                    {event.description && (
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                        {event.description}
                      </p>
                    )}

                    {/* Event Details */}
                    <div className="space-y-3 mb-4 pb-4 border-b border-gray-800">
                      {/* Date & Time */}
                      <div className="flex items-start gap-3">
                        <Calendar size={16} className="text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold">
                            {new Date(event.event_date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                          <p className="text-xs text-gray-400">{event.event_time}</p>
                        </div>
                      </div>

                      {/* Event Type & Location/Link */}
                      <div className="flex items-start gap-3">
                        {event.event_type === "offline" ? (
                          <>
                            <MapPin size={16} className="text-primary mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-gray-400 uppercase font-semibold">
                                {event.event_type}
                              </p>
                              {event.location && (
                                <p className="text-sm">{event.location}</p>
                              )}
                            </div>
                          </>
                        ) : event.event_type === "online" ? (
                          <>
                            <LinkIcon size={16} className="text-primary mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-gray-400 uppercase font-semibold">
                                {event.platform_name || "Online"}
                              </p>
                              {event.meeting_link && (
                                <span className="text-sm text-primary hover:underline break-all">
                                  Join Meeting →
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <MapPin size={16} className="text-primary mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-gray-400 uppercase font-semibold">
                                Hybrid
                              </p>
                              {event.location && (
                                <p className="text-sm text-gray-300">{event.location}</p>
                              )}
                              {event.platform_name && (
                                <p className="text-xs text-gray-400 mt-1">{event.platform_name}</p>
                              )}
                              {event.meeting_link && (
                                <span className="text-xs text-primary hover:underline block mt-1">
                                  Join Online →
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Capacity */}
                    {event.capacity && (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Users size={14} />
                        <span>
                          {event.registered_count} / {event.capacity} registered
                        </span>
                      </div>
                    )}

                    {/* View Details Button */}
                    {event.event_code && (
                      <div className="w-full mt-4 bg-gray-800 group-hover:bg-primary group-hover:text-background text-white px-4 py-2 rounded text-sm font-semibold transition-all text-center">
                        View Full Details →
                      </div>
                    )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()
        ) : (
          <div className="text-center py-12">
            <Calendar size={48} className="mx-auto text-gray-700 mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">
              No Events Available
            </h3>
            <p className="text-gray-400 max-w-md mx-auto">
              {isPremium
                ? "Check back soon for upcoming events!"
                : "Premium events will appear here once you upgrade your membership."}
            </p>
          </div>
        )}

        {/* Upgrade CTA for non-premium */}
        {!isPremium && events.length > 0 && (
          <div className="mt-12 bg-linear-to-r from-primary/20 to-transparent border border-primary/30 rounded-lg p-8 text-center">
            <Crown size={32} className="mx-auto text-primary mb-3" />
            <h3 className="text-2xl font-bold mb-2">Want to Access Premium Events?</h3>
            <p className="text-gray-400 mb-4">
              Upgrade your membership to unlock exclusive premium events
            </p>
            <button
              onClick={() => router.push("/profile")}
              className="px-6 py-3 bg-primary text-background rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Upgrade Membership
          </button>
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
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
    </main>
  );
}
