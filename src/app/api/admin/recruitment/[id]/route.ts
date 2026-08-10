import { NextResponse, NextRequest } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { getFormById } from "@/lib/recruitment";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const formId = parseInt(id, 10);
    if (!Number.isFinite(formId)) {
      return NextResponse.json({ error: "Invalid form ID" }, { status: 400 });
    }

    const form = await getFormById(formId);
    if (!form) {
      return NextResponse.json({ error: "Application form not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: form.id,
      slug: form.slug,
      title: form.title,
      description: form.description,
      is_open: !!form.is_open,
      deadline: form.deadline,
      fields: form.fields,
    });
  } catch (error: any) {
    console.error("Get Apply Form Admin Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch application form" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminRole([1]);
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const formId = parseInt(id, 10);
    if (!Number.isFinite(formId)) {
      return NextResponse.json({ error: "Invalid form ID" }, { status: 400 });
    }

    const existing = await getFormById(formId);
    if (!existing) {
      return NextResponse.json({ error: "Application form not found" }, { status: 404 });
    }

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM recruitment_submissions WHERE form_id = ?`,
      [formId]
    );
    const submissionCount = (countRows[0] as any).total;

    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM recruitment_settings WHERE id = ?`,
      [formId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Application form not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Application form deleted",
      submissionCount,
    });
  } catch (error: any) {
    console.error("Delete Apply Form Admin Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete application form" },
      { status: 500 }
    );
  }
}
