import { NextResponse, NextRequest } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { parseFields, RecruitmentField } from "@/app/api/recruitment/route";

const ALLOWED_TYPES = new Set([
  "text", "email", "phone", "number", "textarea", "select", "radio", "checkbox", "date",
]);

function sanitizeFields(fields: any[]): { ok: boolean; error?: string; fields?: RecruitmentField[] } {
  if (!Array.isArray(fields)) {
    return { ok: false, error: "fields must be an array" };
  }

  const seen = new Set<string>();
  const cleaned: RecruitmentField[] = [];

  for (const [index, raw] of fields.entries()) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: `Field #${index + 1} is invalid` };
    }

    let key = String(raw.key || "").trim();
    const label = String(raw.label || "").trim();

    if (!label) {
      return { ok: false, error: `Field #${index + 1} needs a label` };
    }

    if (!key) {
      key = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || `field_${index + 1}`;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(key)) {
      return { ok: false, error: `Field "${label}" has an invalid key. Use letters, numbers, and underscores only.` };
    }
    if (seen.has(key)) {
      return { ok: false, error: `Duplicate field key "${key}". Each field needs a unique key.` };
    }
    seen.add(key);

    const type = ALLOWED_TYPES.has(raw.type) ? raw.type : "text";
    let options: string[] = [];
    if (type === "select" || type === "radio" || type === "checkbox") {
      options = (Array.isArray(raw.options) ? raw.options : [])
        .map((o: any) => String(o).trim())
        .filter(Boolean);
      if (options.length === 0) {
        return { ok: false, error: `Field "${label}" needs at least one option.` };
      }
    }

    cleaned.push({
      key,
      label,
      type: type as RecruitmentField["type"],
      required: !!raw.required,
      options,
      placeholder: String(raw.placeholder || ""),
      width: raw.width === "half" ? "half" : "full",
    });
  }

  return { ok: true, fields: cleaned };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const offset = (page - 1) * limit;

    const [settingsRows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM recruitment_settings WHERE id = 1 LIMIT 1`
    );

    let settings = null;
    if (settingsRows.length > 0) {
      const row = settingsRows[0] as any;
      settings = {
        id: row.id,
        title: row.title,
        description: row.description,
        is_open: !!row.is_open,
        deadline: row.deadline,
        fields: parseFields(row.fields_json),
      };
    }

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM recruitment_submissions`
    );
    const total = (countRows[0] as any).total;

    const [submissionRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, data, created_at FROM recruitment_submissions
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const submissions = submissionRows.map((row: any) => ({
      id: row.id,
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
      settings,
      submissions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error("Get Recruitment Admin Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch recruitment data" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await checkAdminRole([1]);
    if (!auth.authorized) return auth.response;

    const { title, description, is_open, deadline, fields } = await request.json();

    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const validated = sanitizeFields(fields);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const deadlineValue = deadline ? new Date(deadline).toISOString() : null;

    await pool.query(
      `INSERT INTO recruitment_settings (id, title, description, is_open, deadline, fields_json)
       VALUES (1, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         description = VALUES(description),
         is_open = VALUES(is_open),
         deadline = VALUES(deadline),
         fields_json = VALUES(fields_json),
         updated_at = CURRENT_TIMESTAMP`,
      [
        String(title).trim(),
        String(description || ""),
        !!is_open ? 1 : 0,
        deadlineValue,
        JSON.stringify(validated.fields),
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Recruitment form settings updated",
    });
  } catch (error: any) {
    console.error("Update Recruitment Admin Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update recruitment settings" },
      { status: 500 }
    );
  }
}
