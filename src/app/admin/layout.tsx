"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Allowed paths for Instructor (role 2)
  const allowedInstructorPaths = [
    "/admin",
    "/admin/modules",
    "/admin/challenges",
    "/admin/resources",
    "/admin/events",
    "/admin/notifications",
    "/admin/alumni",
    "/admin/contests",
    "/admin/executives",
    "/admin/achievements",
    "/admin/teams"
  ];

  const userRole = session?.user ? (session.user as any).role : null;
  
  const isInstructorUnauthorized = userRole === 2 && !allowedInstructorPaths.some(allowedPath => {
    if (allowedPath === "/admin") {
      return pathname === "/admin";
    }
    return pathname === allowedPath || pathname.startsWith(allowedPath + "/");
  });

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/login");
      return;
    }

    // Allowed roles: 1 (Admin), 2 (Instructor)
    if (userRole !== 1 && userRole !== 2) {
      router.push("/");
      return;
    }

    // Redirect Instructor (role 2) if on unauthorized path
    if (isInstructorUnauthorized) {
      router.push("/admin");
    }
  }, [session, status, router, userRole, isInstructorUnauthorized, pathname]);

  if (status === "loading" || (session && isInstructorUnauthorized)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400">{isInstructorUnauthorized ? "Redirecting..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  if (!session || (userRole !== 1 && userRole !== 2)) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AdminSidebar />

      {/* Main content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
