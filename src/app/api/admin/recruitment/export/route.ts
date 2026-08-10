import { NextResponse } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { parseFields } from "@/app/api/recruitment/route";

function escapeCsv(value: any): string {
  if (value === null || value === undefined) return "";
  let str: string;
  if (Array.isArray(value)) {
    str = value.join("; ");
  } else if (value instanceof Date) {
    str = value.toISOString();
  } else {
    str = String(value);
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET() {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const [settingsRows] = await pool.query<RowDataPacket[]>(
      `SELECT fields_json FROM recruitment_settings WHERE id = 1 LIMIT 1`
    );
    const fields = settingsRows.length > 0 ? parseFields((settingsRows[0] as any).fields_json) : [];

    const [submissionRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, data, created_at FROM recruitment_submissions ORDER BY created_at DESC, id DESC`
    );

    const headers = ["ID", "Submitted At", ...fields.map((f) => f.label)];
    const lines = [headers.map(escapeCsv).join(",")];

    for (const row of submissionRows as any[]) {
      let data: Record<string, any> = {};
      try {
        data = JSON.parse(row.data);
      } catch {
        data = {};
      }
      const values = [row.id, row.created_at, ...fields.map((f) => data[f.key] ?? "")];
      lines.push(values.map(escapeCsv).join(","));
    }

    const csv = "\uFEFF" + lines.join("\r\n");
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="recruitment-submissions-${date}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Export Recruitment CSV Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to export submissions" },
      { status: 500 }
    );
  }
}
