import { NextResponse } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { ResultSetHeader } from "mysql2";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const submissionId = parseInt(id, 10);
    if (!Number.isFinite(submissionId)) {
      return NextResponse.json({ error: "Invalid submission ID" }, { status: 400 });
    }

    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM recruitment_submissions WHERE id = ?`,
      [submissionId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Submission deleted" });
  } catch (error: any) {
    console.error("Delete Recruitment Submission Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete submission" },
      { status: 500 }
    );
  }
}
