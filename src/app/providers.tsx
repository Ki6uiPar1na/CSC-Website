"use client";

import { SessionProvider } from "next-auth/react";
import { NotificationProvider } from "@/lib/NotificationContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath="/api/auth" refetchInterval={0}>
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </SessionProvider>
  );
}
