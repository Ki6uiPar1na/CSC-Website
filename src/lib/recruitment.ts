import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export interface RecruitmentField {
  key: string;
  label: string;
  type: "text" | "email" | "phone" | "number" | "textarea" | "select" | "radio" | "checkbox" | "date";
  required: boolean;
  options: string[];
  placeholder: string;
  width: "full" | "half";
}

export interface RecruitmentForm {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  is_open: number | boolean;
  deadline: string | null;
  fields: RecruitmentField[];
  submission_count?: number;
}

export interface FormOpenStatus {
  open: boolean;
  reason?: string;
}

export const FIELD_TYPES = new Set([
  "text", "email", "phone", "number", "textarea", "select", "radio", "checkbox", "date",
]);

export function parseFields(fieldsJson: string | null): RecruitmentField[] {
  if (!fieldsJson) return [];
  try {
    const parsed = JSON.parse(fieldsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((f: any) => f && typeof f.key === "string" && typeof f.label === "string")
      .map((f: any) => ({
        key: f.key,
        label: f.label,
        type: FIELD_TYPES.has(f.type) ? f.type : "text",
        required: !!f.required,
        options: Array.isArray(f.options) ? f.options.map(String) : [],
        placeholder: f.placeholder || "",
        width: f.width === "half" ? "half" : "full",
      }));
  } catch {
    return [];
  }
}

function mapFormRow(row: any): RecruitmentForm {
  return {
    id: row.id,
    slug: row.slug || `form-${row.id}`,
    title: row.title,
    description: row.description,
    is_open: row.is_open,
    deadline: row.deadline,
    fields: parseFields(row.fields_json),
    submission_count: row.submission_count ?? undefined,
  };
}

export async function getAllForms(includeClosed = true): Promise<RecruitmentForm[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT rs.*, (SELECT COUNT(*) FROM recruitment_submissions rs2 WHERE rs2.form_id = rs.id) AS submission_count
     FROM recruitment_settings rs
     ORDER BY rs.created_at DESC, rs.id DESC`
  );
  let forms = (rows as any[]).map(mapFormRow);
  if (!includeClosed) {
    forms = forms.filter((f) => isFormOpenNow(f).open);
  }
  return forms;
}

export async function getFormBySlug(slug: string): Promise<RecruitmentForm | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM recruitment_settings WHERE slug = ? LIMIT 1`,
    [slug]
  );
  if (rows.length === 0) return null;
  return mapFormRow(rows[0] as any);
}

export async function getFormById(id: number): Promise<RecruitmentForm | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM recruitment_settings WHERE id = ? LIMIT 1`,
    [id]
  );
  if (rows.length === 0) return null;
  return mapFormRow(rows[0] as any);
}

export function isFormOpenNow(form: Pick<RecruitmentForm, "is_open" | "deadline">): FormOpenStatus {
  if (!form.is_open) return { open: false, reason: "Applications are currently closed." };
  if (form.deadline && new Date(form.deadline).getTime() < Date.now()) {
    return { open: false, reason: "The application deadline has passed." };
  }
  return { open: true };
}

export function slugify(value: string, fallback = "application"): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || fallback;
}

export async function isSlugAvailable(
  slug: string,
  excludeId?: number
): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM recruitment_settings WHERE slug = ? ${excludeId ? "AND id <> ?" : ""} LIMIT 1`,
    excludeId ? [slug, excludeId] : [slug]
  );
  return rows.length === 0;
}
