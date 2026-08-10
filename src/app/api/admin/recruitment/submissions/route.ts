import { NextResponse, NextRequest } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const formId = parseInt(searchParams.get("form_id") || "", 10);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const offset = (page - 1) * limit;

    const whereClause = Number.isFinite(formId) ? "WHERE form_id = ?" : "";
    const params: any[] = [];
    if (Number.isFinite(formId)) params.push(formId);
    params.push(limit, offset);

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM recruitment_submissions ${whereClause}`,
      Number.isFinite(formId) ? [formId] : []
    );
    const total = (countRows[0] as any).total;

    const [submissionRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, form_id, data, created_at FROM recruitment_submissions
       ${whereClause}
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      params
    );

    const submissions = submissionRows.map((row: any) => ({
      id: row.id,
      form_id: row.form_id,
      data: (() => {
        try {
          return JSON.parse(row.data);
        } catch {
          return {};
        }
      })(),
      created_at: row.created_at,
    }));

    return NextResponse.json({
      submissions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error("Get Submissions Admin Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}
