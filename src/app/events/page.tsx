"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Link as LinkIcon, Users, Crown, Share2, Search, ArrowLeft } from "lucide-react";

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

type SortOrder = "date_desc" | "date_asc" | "title_asc" | "title_desc";

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="bg-card-bg/80 border border-gray-800 rounded-2xl p-5 flex gap-5 animate-pulse">
        <div className="hidden sm:block w-48 h-40 bg-gray-800/60 rounded-xl shrink-0"></div>
        <div className="flex-1 space-y-3 py-1">
          <div className="h-5 bg-gray-800/60 rounded w-2/3"></div>
          <div className="h-3 bg-gray-800/40 rounded w-1/3"></div>
          <div className="h-3 bg-gray-800/40 rounded w-full"></div>
          <div className="h-3 bg-gray-800/40 rounded w-3/4"></div>
        </div>
      </div>
    ))}
  </div>
);

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
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOrder>("date_desc");
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
      const response = await fetch(`/api/events?page=${currentPage}&limit=15`);

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

  const eventTypes = Array.from(new Set(events.map((e) => e.type))).filter(Boolean).sort();

  const filteredEvents = events.filter((event) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      event.title.toLowerCase().includes(query) ||
      event.type.toLowerCase().includes(query) ||
      (event.description && event.description.toLowerCase().includes(query)) ||
      (event.location && event.location.toLowerCase().includes(query));
    const matchesType = typeFilter === "all" || event.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (sortBy === "date_asc") return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
    if (sortBy === "date_desc") return new Date(b.event_date).getTime() - new Date(a.event_date).getTime();
    if (sortBy === "title_asc") return a.title.localeCompare(b.title);
    if (sortBy === "title_desc") return b.title.localeCompare(a.title);
    return 0;
  });

  if (status === "loading" || loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto space-y-8 py-4 px-2 sm:px-4">
          <div className="bg-card-bg/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-5 animate-pulse">
            <div className="h-8 bg-gray-800/60 rounded w-1/3"></div>
          </div>
          <div className="bg-card-bg/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-4 sm:p-6 animate-pulse">
            <div className="h-10 bg-gray-800/40 rounded-xl"></div>
          </div>
          <LoadingSkeleton />
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto space-y-8 py-4 px-2 sm:px-4">
        {/* Header card */}
        <div className="bg-card-bg/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              title="Back to Home"
              className="p-2.5 rounded-2xl bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-primary transition-colors shadow-sm shrink-0"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2 flex-wrap">
                <Calendar size={22} className="text-primary shrink-0" />
                Events & News Update
                {isPremium && (
                  <span className="flex items-center gap-1 bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-xs font-semibold">
                    <Crown size={12} />
                    Premium
                  </span>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                {isPremium
                  ? "You have access to all premium and free events"
                  : "Showing available events for your subscription level"}
              </p>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-card-bg/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 transition-colors">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            <div className="relative lg:col-span-6">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search events by title, type, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-gray-800 focus:border-primary rounded-xl pl-10 pr-3 py-2.5 text-xs sm:text-sm text-foreground outline-none transition-all"
              />
            </div>
            <div className="lg:col-span-3">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full bg-black/40 border border-gray-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-foreground outline-none font-mono"
              >
                <option value="all">All Types</option>
                {eventTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOrder)}
                className="w-full bg-black/40 border border-gray-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-foreground outline-none font-mono"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="title_asc">Title (A-Z)</option>
                <option value="title_desc">Title (Z-A)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Message for non-premium users */}
        {message && (
          <div className="bg-blue-900/30 border border-blue-700 text-blue-200 px-4 py-3 rounded-xl">
            <p className="text-sm">{message}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded-xl">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Events Feed List */}
        {sortedEvents.length > 0 ? (
          <div className="space-y-4">
            {sortedEvents.map((event) => {
              const photo = event.photo_url || (event.gallery_images && JSON.parse(event.gallery_images).length > 0 ? JSON.parse(event.gallery_images)[0] : null);
              return (
                <div
                  key={event.id}
                  onClick={() => event.event_code && router.push(`/events/${event.event_code}`)}
                  className="bg-card-bg/80 backdrop-blur-xl border border-gray-800 rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-glow-primary transition-all cursor-pointer group"
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* Event Photo */}
                    {photo && (
                      <div className="sm:w-48 lg:w-56 shrink-0 overflow-hidden border-b sm:border-b-0 sm:border-r border-gray-800">
                        <img
                          src={photo}
                          alt={event.title}
                          className="w-full h-40 sm:h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}

                    <div className="flex-1 p-4 sm:p-5">
                      {/* Title + share */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-lg sm:text-xl font-bold group-hover:text-primary transition-colors break-words">{event.title}</h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(getEventShareUrl(event.event_code), event.id);
                          }}
                          className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-primary shrink-0"
                          title="Share Event"
                        >
                          {copiedEventId === event.id ? <span className="text-[10px] font-bold text-primary animate-in fade-in zoom-in duration-300">COPIED!</span> : <Share2 size={18} />}
                        </button>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                          {event.type}
                        </span>
                        {event.target_audience && event.target_audience !== 'all' && (
                          <span className="text-[10px] tracking-tighter bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 uppercase font-bold">
                            {event.target_audience}
                          </span>
                        )}
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

                      {/* Description */}
                      {event.description && (
                        <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                          {event.description}
                        </p>
                      )}

                      {/* Details row */}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-primary" />
                          {new Date(event.event_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {event.event_time && <span className="text-gray-500">· {event.event_time}</span>}
                        </span>

                        {event.event_type === "offline" && event.location && (
                          <span className="flex items-center gap-1.5">
                            <MapPin size={14} className="text-primary" />
                            <span className="truncate max-w-[220px]">{event.location}</span>
                          </span>
                        )}
                        {event.event_type === "online" && (
                          <span className="flex items-center gap-1.5">
                            <LinkIcon size={14} className="text-primary" />
                            {event.platform_name || "Online"}
                          </span>
                        )}
                        {event.event_type === "hybrid" && (
                          <span className="flex items-center gap-1.5">
                            <MapPin size={14} className="text-primary" />
                            {event.location || "Hybrid"}
                          </span>
                        )}

                        {event.capacity && (
                          <span className="flex items-center gap-1.5">
                            <Users size={14} className="text-primary" />
                            {event.registered_count} / {event.capacity}
                          </span>
                        )}
                      </div>

                      {/* View Details */}
                      {event.event_code && (
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="w-full sm:w-auto px-4 py-2 bg-gray-800 group-hover:bg-primary group-hover:text-background text-white rounded-xl text-sm font-semibold transition-all text-center">
                            View Full Details →
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-card-bg/80 backdrop-blur-xl border border-dashed border-gray-800 rounded-2xl py-20 text-center">
            {searchQuery || typeFilter !== "all" ? (
              <>
                <Search size={48} className="mx-auto text-gray-700 mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No matches found</h3>
                <p className="text-gray-500">Try adjusting your search terms or filters.</p>
              </>
            ) : (
              <>
                <Calendar size={48} className="mx-auto text-gray-700 mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">
                  No Events Available
                </h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  {isPremium
                    ? "Check back soon for upcoming events!"
                    : "Premium events will appear here once you upgrade your membership."}
                </p>
              </>
            )}
          </div>
        )}

        {/* Upgrade CTA for non-premium */}
        {!isPremium && events.length > 0 && (
          <div className="bg-gradient-to-r from-primary/20 to-transparent border border-primary/30 rounded-2xl p-8 text-center">
            <Crown size={32} className="mx-auto text-primary mb-3" />
            <h3 className="text-2xl font-bold mb-2">Want to Access Premium Events?</h3>
            <p className="text-gray-400 mb-4">
              Upgrade your membership to unlock exclusive premium events
            </p>
            <button
              onClick={() => router.push("/profile")}
              className="px-6 py-3 bg-primary text-background rounded-xl font-semibold hover:bg-primary/90 transition-colors"
            >
              Upgrade Membership
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Page {currentPage} of {totalPages}</span>
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
