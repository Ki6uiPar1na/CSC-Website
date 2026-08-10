import { NextResponse, NextRequest } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { getFormById, getAllForms } from "@/lib/recruitment";

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

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const formId = parseInt(searchParams.get("form_id") || "", 10);

    let formLabel = "all-forms";
    let whereClause = "";
    const params: any[] = [];
    let fields: any[] = [];

    if (Number.isFinite(formId)) {
      const form = await getFormById(formId);
      if (!form) {
        return NextResponse.json({ error: "Application form not found" }, { status: 404 });
      }
      formLabel = form.slug;
      fields = form.fields;
      whereClause = "WHERE form_id = ?";
      params.push(formId);
    } else {
      const labelMap: Record<string, string> = {};
      for (const form of await getAllForms(true)) {
        for (const f of form.fields) {
          if (!labelMap[f.key]) labelMap[f.key] = f.label;
        }
      }
      fields = Object.keys(labelMap).map((key) => ({ key, label: labelMap[key] }));
    }

    const [submissionRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, form_id, data, created_at FROM recruitment_submissions ${whereClause} ORDER BY created_at DESC, id DESC`,
      params
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
        "Content-Disposition": `attachment; filename="applications-${formLabel}-${date}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Export Submissions CSV Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to export submissions" },
      { status: 500 }
    );
  }
}
