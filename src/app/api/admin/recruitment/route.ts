import { NextResponse, NextRequest } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import {
  RecruitmentField,
  getAllForms,
  getFormById,
  isSlugAvailable,
  slugify,
} from "@/lib/recruitment";

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

async function resolveUniqueSlug(base: string, excludeId?: number): Promise<string> {
  const candidate = slugify(base);
  if (await isSlugAvailable(candidate, excludeId)) return candidate;
  for (let i = 2; i < 100; i++) {
    const next = `${candidate}-${i}`;
    if (await isSlugAvailable(next, excludeId)) return next;
  }
  return `${candidate}-${Date.now()}`;
}

export async function GET() {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const forms = await getAllForms(true);
    return NextResponse.json({
      forms: forms.map((f) => ({
        id: f.id,
        slug: f.slug,
        title: f.title,
        description: f.description,
        description_align: f.description_align,
        is_open: !!f.is_open,
        deadline: f.deadline,
        submission_count: f.submission_count ?? 0,
      })),
    });
  } catch (error: any) {
    console.error("Get Apply Forms Admin Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch application forms" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminRole([1]);
    if (!auth.authorized) return auth.response;

    const { title, description, description_align, is_open, deadline, fields, slug } = await request.json();

    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const validated = sanitizeFields(fields);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const formSlug = await resolveUniqueSlug(String(slug || title).trim());
    const deadlineValue = deadline ? new Date(deadline).toISOString() : null;

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO recruitment_settings (slug, title, description, description_align, is_open, deadline, fields_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        formSlug,
        String(title).trim(),
        String(description || ""),
        ["center", "right"].includes(description_align) ? description_align : "left",
        !!is_open ? 1 : 0,
        deadlineValue,
        JSON.stringify(validated.fields),
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Application form created",
      form: { id: result.insertId, slug: formSlug },
    });
  } catch (error: any) {
    console.error("Create Apply Form Admin Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create application form" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await checkAdminRole([1]);
    if (!auth.authorized) return auth.response;

    const { id, title, description, description_align, is_open, deadline, fields, slug } = await request.json();
    const formId = parseInt(id, 10);
    if (!Number.isFinite(formId)) {
      return NextResponse.json({ error: "Invalid form ID" }, { status: 400 });
    }

    const existing = await getFormById(formId);
    if (!existing) {
      return NextResponse.json({ error: "Application form not found" }, { status: 404 });
    }

    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const validated = sanitizeFields(fields);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    let formSlug = existing.slug;
    const requestedSlug = String(slug || "").trim();
    if (requestedSlug && requestedSlug !== existing.slug) {
      const candidate = slugify(requestedSlug);
      if (!(await isSlugAvailable(candidate, formId))) {
        return NextResponse.json({ error: "That slug is already in use." }, { status: 400 });
      }
      formSlug = candidate;
    }

    const deadlineValue = deadline ? new Date(deadline).toISOString() : null;

    await pool.query(
      `UPDATE recruitment_settings SET
         slug = ?,
         title = ?,
         description = ?,
         description_align = ?,
         is_open = ?,
         deadline = ?,
         fields_json = ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        formSlug,
        String(title).trim(),
        String(description || ""),
        ["center", "right"].includes(description_align) ? description_align : "left",
        !!is_open ? 1 : 0,
        deadlineValue,
        JSON.stringify(validated.fields),
        formId,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Application form updated",
      form: { id: formId, slug: formSlug },
    });
  } catch (error: any) {
    console.error("Update Apply Form Admin Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update application form" },
      { status: 500 }
    );
  }
}
