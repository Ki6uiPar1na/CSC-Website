"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Bell, X, CheckCircle, AlertCircle } from "lucide-react";

interface Notification {
  id: string;
  type: "payment_rejected" | "payment_approved" | "premium_activated" | "system";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export default function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [session?.user]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/user/notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/user/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      fetchNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch("/api/user/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      fetchNotifications();
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "payment_approved":
      case "premium_activated":
        return <CheckCircle size={16} className="text-accent" />;
      case "payment_rejected":
        return <AlertCircle size={16} className="text-error" />;
      default:
        return <Bell size={16} className="text-primary" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "payment_approved":
      case "premium_activated":
        return "bg-accent/10 border-accent/30";
      case "payment_rejected":
        return "bg-error/10 border-error/30";
      default:
        return "bg-primary/10 border-primary/30";
    }
  };

  return (
    <>
      {session?.user ? (
        <div className="relative">
          {/* Bell Icon Button */}
          <button
            onClick={() => {
              setIsOpen(!isOpen);
              // Refresh notifications when opening dropdown
              if (!isOpen) {
                fetchNotifications();
              }
            }}
            className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-accent/30 transition-all duration-200 bg-accent/10 border border-accent cursor-pointer"
            title="Notifications"
          >
            <Bell size={22} className="text-accent font-bold" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 text-[10px] font-bold text-background bg-accent rounded-full border-2 border-background">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {isOpen && (
            <div className="absolute right-0 top-full mt-2 w-96 max-h-96 overflow-y-auto bg-secondary border border-border-color rounded-lg shadow-xl z-50 backdrop-blur-xl custom-scrollbar">
          {/* Header */}
          <div className="sticky top-0 bg-secondary border-b border-border-color p-4 flex justify-between items-center">
            <h3 className="text-sm font-bold text-primary uppercase tracking-widest">
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-300 transition-colors bg-transparent border-none cursor-pointer p-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Notifications List */}
          {notifications.length > 0 ? (
            <div className="divide-y divide-border-color/30">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-l-2 transition-colors ${
                    notification.read ? "bg-black/20 border-l-gray-600" : "bg-black/40 border-l-primary"
                  } ${getNotificationColor(notification.type)}`}
                >
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-grow min-w-0">
                      <h4 className="text-xs font-bold text-foreground mb-1">
                        {notification.title}
                      </h4>
                      <p className="text-xs text-gray-400 mb-2">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono">
                        {new Date(notification.timestamp).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-[10px] px-2 py-1 bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors border-none cursor-pointer font-mono uppercase"
                          title="Mark as read"
                        >
                          Read
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-gray-500 hover:text-error transition-colors bg-transparent border-none cursor-pointer p-0"
                        title="Delete notification"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Bell size={24} className="text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500 font-mono uppercase">
                No notifications yet
              </p>
            </div>
          )}

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="sticky bottom-0 bg-secondary border-t border-border-color p-3 text-center">
              <button
                onClick={() => {
                  setNotifications([]);
                  setUnreadCount(0);
                }}
                className="text-xs text-gray-400 hover:text-gray-300 transition-colors bg-transparent border-none cursor-pointer uppercase font-mono"
              >
                Clear All
              </button>
            </div>
          )}
            </div>
          )}
        </div>
      ) : null}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--primary);
          opacity: 0.5;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          opacity: 0.8;
        }
      `}</style>
    </>
  );
}
