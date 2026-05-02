"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useSession } from "next-auth/react";

interface NotificationContextType {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  decreaseUnreadCount: () => void;
  increaseUnreadCount: () => void;
  refetchUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);

  const refetchUnreadCount = useCallback(async () => {
    if (!session?.user) return;

    try {
      const res = await fetch("/api/user/notifications");
      if (res.ok) {
        const data = await res.json();
        // Use the unreadCount from the API which is calculated from the database
        // This ensures we're getting the accurate count of is_read = 0 notifications
        const count = data.unreadCount || 0;
        console.log(`[NotificationContext] Unread count: ${count}`);
        setUnreadCount(count);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, [session?.user]);

  const decreaseUnreadCount = useCallback(() => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const increaseUnreadCount = useCallback(() => {
    setUnreadCount((prev) => prev + 1);
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    if (session?.user) {
      refetchUnreadCount();
    }
  }, [session?.user, refetchUnreadCount]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!session?.user) return;

    const interval = setInterval(() => {
      refetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [session?.user, refetchUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        setUnreadCount,
        decreaseUnreadCount,
        increaseUnreadCount,
        refetchUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}
