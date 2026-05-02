import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export type RoleCheckResult = {
  authorized: boolean;
  userId?: number;
  userRole?: number;
  response: NextResponse; // Made required for easier handling
};

/**
 * Checks if the current user has the required role to access an admin API.
 * 
 * @param requiredRoles Array of role IDs that are allowed access. 
 *                      Typically [1] for Admin only, or [1, 2] for Admin and Instructor.
 */
export async function checkAdminRole(requiredRoles: number[] = [1]): Promise<RoleCheckResult> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.log("[RoleCheck] No session found");
      return {
        authorized: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      };
    }

    const userId = "id" in session.user ? parseInt((session.user as any).id) : null;
    if (!userId) {
      console.log("[RoleCheck] No user ID in session");
      return {
        authorized: false,
        response: NextResponse.json({ error: "Invalid user session" }, { status: 400 })
      };
    }

    // Fetch the latest role from the database to ensure it hasn't changed
    const [userRows] = await pool.query<RowDataPacket[]>(
      `SELECT role_id FROM users WHERE id = ?`,
      [userId]
    );

    if (userRows.length === 0) {
      console.log(`[RoleCheck] User ${userId} not found in DB`);
      return {
        authorized: false,
        response: NextResponse.json({ error: "User not found" }, { status: 404 })
      };
    }

    const userRole = userRows[0].role_id;

    if (!requiredRoles.includes(userRole)) {
      console.log(`[RoleCheck] User ${userId} with role ${userRole} denied access to roles ${requiredRoles}`);
      const errorMsg = requiredRoles.includes(2) 
        ? "Admin or Instructor access required" 
        : "Admin access required";
        
      return {
        authorized: false,
        userRole,
        response: NextResponse.json({ error: errorMsg }, { status: 403 })
      };
    }

    return {
      authorized: true,
      userId,
      userRole,
      response: NextResponse.json({ success: true }) // Default success response
    };
  } catch (error: any) {
    console.error("Role Check Error:", error);
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Internal server error during authorization" },
        { status: 500 }
      )
    };
  }
}
