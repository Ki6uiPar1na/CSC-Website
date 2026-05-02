"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, X, CheckCircle, AlertCircle, Trash2, Calendar, BookOpen, Zap } from "lucide-react";
import { useNotifications } from "@/lib/NotificationContext";

interface Notification {
  id: string;
  type: "payment_rejected" | "payment_approved" | "premium_activated" | "system" | "event_update" | "resource_update" | "challenge_update";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  targetAudience?: string;
}

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { decreaseUnreadCount, refetchUnreadCount } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (status !== "loading" && !session) {
      router.push("/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
    }
  }, [session?.user]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Find the notification to check if it's currently unread
      const notification = notifications.find(n => n.id === notificationId);
      const wasUnread = notification && !notification.read;

      // Update local state immediately (optimistic update)
      if (wasUnread) {
        setNotifications(notifications.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
        decreaseUnreadCount(); // Also update the global context
      }

      // Then update the database
      const response = await fetch("/api/user/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });

      if (!response.ok) {
        // If database update fails, revert the local change
        fetchNotifications();
        throw new Error("Failed to mark notification as read");
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      // Refetch to ensure local state matches database
      fetchNotifications();
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      // Find the notification to check if it's unread
      const notification = notifications.find(n => n.id === notificationId);
      const wasUnread = notification && !notification.read;

      // Optimistic update: Remove from local state immediately
      setNotifications(notifications.filter(n => n.id !== notificationId));
      
      // If it was unread, update the count
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
        decreaseUnreadCount();
      }

      // Then delete from database
      const response = await fetch("/api/user/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });

      if (!response.ok) {
        // If deletion fails, refetch to revert the optimistic update
        fetchNotifications();
        throw new Error("Failed to delete notification");
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      // Refetch to ensure local state matches database
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      if (unreadNotifications.length === 0) return; // Nothing to do

      // Optimistic update: Update local state immediately
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);

      // Update the global context
      for (let i = 0; i < unreadNotifications.length; i++) {
        decreaseUnreadCount();
      }

      // Then update the database
      const results = [];
      for (const notification of unreadNotifications) {
        const response = await fetch("/api/user/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: notification.id }),
        });
        results.push(response.ok);
      }

      // If any update failed, refetch to ensure consistency
      if (!results.every(r => r)) {
        fetchNotifications();
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
      // Refetch to ensure local state matches database
      fetchNotifications();
    }
  };

  const deleteAllNotifications = async () => {
    try {
      // Count unread notifications before deletion
      const unreadCount = notifications.filter(n => !n.read).length;

      // Optimistic update: Clear all notifications locally
      setNotifications([]);
      setUnreadCount(0);

      // Update the global context
      for (let i = 0; i < unreadCount; i++) {
        decreaseUnreadCount();
      }

      // Then delete all from database
      const results = [];
      for (const notification of notifications) {
        const response = await fetch("/api/user/notifications", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: notification.id }),
        });
        results.push(response.ok);
      }

      // If any delete failed, refetch to ensure consistency
      if (!results.every(r => r)) {
        fetchNotifications();
      }
    } catch (error) {
      console.error("Error deleting all notifications:", error);
      // Refetch to ensure local state matches database
      fetchNotifications();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "payment_approved":
      case "premium_activated":
        return <CheckCircle size={20} className="text-accent" />;
      case "payment_rejected":
        return <AlertCircle size={20} className="text-error" />;
      case "event_update":
        return <Calendar size={20} className="text-primary" />;
      case "resource_update":
        return <BookOpen size={20} className="text-primary" />;
      case "challenge_update":
        return <Zap size={20} className="text-accent" />;
      default:
        return <Bell size={20} className="text-primary" />;
    }
  };

  const getNotificationColor = (type: string, targetAudience?: string) => {
    // First, check if it's a broadcast for specific user types
    if (targetAudience === "premium_users") {
      return "bg-purple-500/10 border-purple-500/30";
    }
    if (targetAudience === "non_premium_users") {
      return "bg-blue-500/10 border-blue-500/30";
    }
    if (targetAudience === "all_users") {
      return "bg-cyan-500/10 border-cyan-500/30";
    }

    // If not a broadcast, use type-based colors (personal notifications)
    switch (type) {
      case "payment_approved":
      case "premium_activated":
        return "bg-accent/10 border-accent/30";
      case "payment_rejected":
        return "bg-error/10 border-error/30";
      case "event_update":
      case "resource_update":
      case "challenge_update":
        return "bg-primary/10 border-primary/30";
      default:
        return "bg-primary/10 border-primary/30";
    }
  };

  if (status === "loading" || isLoading) {
    return <div className="p-8 text-center text-primary font-mono animate-pulse">Loading notifications...</div>;
  }

  if (!session) return null;

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notifications</h1>
        <p className="text-gray-400 text-sm">
          {notifications.length === 0 
            ? "No notifications yet" 
            : `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Action Buttons */}
      {notifications.length > 0 && (
        <div className="flex gap-3 mb-6">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="primary px-4 py-2 text-xs uppercase font-mono"
            >
              Mark All as Read
            </button>
          )}
          <button
            onClick={deleteAllNotifications}
            className="bg-error/10 border border-error/30 text-error px-4 py-2 text-xs uppercase font-mono hover:bg-error/20 transition-colors"
          >
            Delete All
          </button>
        </div>
      )}

      {/* Notifications List */}
      {notifications.length > 0 ? (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`card border-l-4 transition-all ${
                notification.read ? "bg-black/20 opacity-75" : "bg-black/40"
              } ${getNotificationColor(notification.type, notification.targetAudience)}`}
              style={{
                borderLeftColor: notification.targetAudience === "premium_users" ? "#a855f7" : 
                                 notification.targetAudience === "non_premium_users" ? "#3b82f6" :
                                 notification.targetAudience === "all_users" ? "#06b6d4" :
                                 "currentColor"
              }}
            >
              <div className="flex items-start gap-4">
                {getNotificationIcon(notification.type)}
                
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold">
                      {notification.title}
                    </h3>
                    {notification.targetAudience && (
                      <span className={`text-xs px-2 py-0.5 rounded font-mono uppercase tracking-wider ${
                        notification.targetAudience === "premium_users" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" :
                        notification.targetAudience === "non_premium_users" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                        notification.targetAudience === "all_users" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" :
                        "bg-gray-500/20 text-gray-400"
                      }`}>
                        {notification.targetAudience === "premium_users" ? "Premium" :
                         notification.targetAudience === "non_premium_users" ? "Free" :
                         notification.targetAudience === "all_users" ? "Broadcast" :
                         "Personal"}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 font-mono">
                    {new Date(notification.timestamp).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2 shrink-0">
                  {!notification.read && (
                    <span className="inline-block w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="text-xs px-3 py-1 bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors border-none cursor-pointer font-mono uppercase"
                      title="Mark as read"
                    >
                      Read
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="text-gray-500 hover:text-error transition-colors bg-transparent border-none cursor-pointer p-1"
                    title="Delete notification"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Bell size={32} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 font-mono uppercase tracking-widest">
            No notifications yet
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Check back later for updates on your payment requests and account activities.
          </p>
        </div>
      )}
    </div>
  );
}
