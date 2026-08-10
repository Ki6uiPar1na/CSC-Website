import { NextResponse, NextRequest } from "next/server";
import pool from "@/models/db";
import { checkRateLimitByConfig } from "@/lib/rateLimit";
import { getFormBySlug, isFormOpenNow } from "@/lib/recruitment";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^01\d{9}$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const form = await getFormBySlug(slug);
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
    console.error("Get Application Form Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load application form" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const limitCheck = checkRateLimitByConfig(ip, "RECRUITMENT_SUBMIT");
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again later." },
        { status: 429 }
      );
    }

    const { slug } = await params;
    const form = await getFormBySlug(slug);
    if (!form) {
      return NextResponse.json({ error: "Application form not found" }, { status: 404 });
    }

    const status = isFormOpenNow(form);
    if (!status.open) {
      return NextResponse.json({ error: status.reason }, { status: 400 });
    }

    if (form.fields.length === 0) {
      return NextResponse.json({ error: "This form has no fields configured" }, { status: 400 });
    }

    const body = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid submission data" }, { status: 400 });
    }

    const cleanData: Record<string, any> = {};

    for (const field of form.fields) {
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
      `INSERT INTO recruitment_submissions (form_id, data, created_at) VALUES (?, ?, NOW())`,
      [form.id, JSON.stringify(cleanData)]
    );

    return NextResponse.json(
      { success: true, message: "Application submitted successfully!" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Submit Application Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit application" },
      { status: 500 }
    );
  }
}
