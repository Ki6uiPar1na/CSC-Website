import { NextResponse, NextRequest } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { checkRateLimitByConfig } from "@/lib/rateLimit";

export interface RecruitmentField {
  key: string;
  label: string;
  type: "text" | "email" | "phone" | "number" | "textarea" | "select" | "radio" | "checkbox" | "date";
  required: boolean;
  options: string[];
  placeholder: string;
  width: "full" | "half";
}

export interface RecruitmentSettings {
  id: number;
  title: string;
  description: string | null;
  is_open: number | boolean;
  deadline: string | null;
  fields: RecruitmentField[];
}

const FIELD_TYPES = new Set([
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

export async function getRecruitmentSettings(): Promise<RecruitmentSettings | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM recruitment_settings WHERE id = 1 LIMIT 1`
  );
  if (rows.length === 0) return null;
  const row = rows[0] as any;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    is_open: row.is_open,
    deadline: row.deadline,
    fields: parseFields(row.fields_json),
  };
}

function isOpenNow(settings: RecruitmentSettings): { open: boolean; reason?: string } {
  if (!settings.is_open) return { open: false, reason: "Applications are currently closed." };
  if (settings.deadline && new Date(settings.deadline).getTime() < Date.now()) {
    return { open: false, reason: "The application deadline has passed." };
  }
  return { open: true };
}

export async function GET() {
  try {
    const settings = await getRecruitmentSettings();
    if (!settings) {
      return NextResponse.json({ error: "Recruitment form not configured yet" }, { status: 404 });
    }
    return NextResponse.json({
      title: settings.title,
      description: settings.description,
      is_open: !!settings.is_open,
      deadline: settings.deadline,
      fields: settings.fields,
    });
  } catch (error: any) {
    console.error("Get Recruitment Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load recruitment form" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const limitCheck = checkRateLimitByConfig(ip, "RECRUITMENT_SUBMIT");
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again later." },
        { status: 429 }
      );
    }

    const settings = await getRecruitmentSettings();
    if (!settings) {
      return NextResponse.json({ error: "Recruitment form not configured yet" }, { status: 404 });
    }

    const status = isOpenNow(settings);
    if (!status.open) {
      return NextResponse.json({ error: status.reason }, { status: 400 });
    }

    if (settings.fields.length === 0) {
      return NextResponse.json({ error: "Recruitment form has no fields configured" }, { status: 400 });
    }

    const body = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid submission data" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^01\d{9}$/;
    const cleanData: Record<string, any> = {};

    for (const field of settings.fields) {
      const raw = body[field.key];
      const isEmpty = raw === undefined || raw === null || raw === "" ||
        (Array.isArray(raw) && raw.length === 0);

      if (field.required && isEmpty) {
        return NextResponse.json({ error: `${field.label} is required.` }, { status: 400 });
      }

      if (isEmpty) {
        cleanData[field.key] = "";
        continue;
      }

      let value: any = raw;

      if (field.type === "checkbox") {
        const values = Array.isArray(raw) ? raw.map(String) : [String(raw)];
        for (const v of values) {
          if (field.options.length > 0 && !field.options.includes(v)) {
            return NextResponse.json({ error: `Invalid option selected for ${field.label}.` }, { status: 400 });
          }
        }
        value = values;
      } else if (field.type === "select" || field.type === "radio") {
        value = String(raw);
        if (field.options.length > 0 && !field.options.includes(value)) {
          return NextResponse.json({ error: `Invalid option selected for ${field.label}.` }, { status: 400 });
        }
      } else if (field.type === "email") {
        value = String(raw).trim();
        if (!emailRegex.test(value)) {
          return NextResponse.json({ error: `Please enter a valid email for ${field.label}.` }, { status: 400 });
        }
      } else if (field.type === "phone") {
        value = String(raw).trim();
        if (!phoneRegex.test(value)) {
          return NextResponse.json({ error: `Please enter a valid Bangladeshi phone number for ${field.label}.` }, { status: 400 });
        }
      } else if (field.type === "number") {
        value = Number(raw);
        if (Number.isNaN(value)) {
          return NextResponse.json({ error: `${field.label} must be a number.` }, { status: 400 });
        }
      } else {
        value = String(raw).trim();
      }

      cleanData[field.key] = value;
    }

    await pool.query(
      `INSERT INTO recruitment_submissions (data, created_at) VALUES (?, NOW())`,
      [JSON.stringify(cleanData)]
    );

    return NextResponse.json(
      { success: true, message: "Application submitted successfully!" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Submit Recruitment Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit application" },
      { status: 500 }
    );
  }
}
