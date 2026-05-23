import { NextResponse, NextRequest } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id, userId } = await params;
    const auth = await checkAdminRole([1]);
    if (!auth.authorized) return auth.response;

    await pool.query(
      `DELETE FROM team_members WHERE team_id=? AND user_id=?`,
      [id, userId]
    );

    return NextResponse.json({ message: "Member removed successfully" });
  } catch (error: any) {
    console.error("Remove Team Member Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove member" },
      { status: 500 }
    );
  }
}
