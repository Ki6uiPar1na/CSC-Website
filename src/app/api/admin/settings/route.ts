import { NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { checkAdminRole } from "@/lib/admin-auth";

export async function GET(req: Request) {
  try {
    const auth = await checkAdminRole([1]); // Admin only
    if (!auth.authorized) return auth.response;

    const [settings] = await pool.query<RowDataPacket[]>(
      `SELECT setting_key, setting_value FROM site_settings ORDER BY setting_key`
    );

    // Convert to object
    const settingsObj = settings.reduce((acc: any, setting) => {
      acc[setting.setting_key] = setting.setting_value;
      return acc;
    }, {});

    return NextResponse.json({ settings: settingsObj }, { status: 200 });
  } catch (error: any) {
    console.error("Get Settings Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await checkAdminRole([1]); // Admin only
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { key, value } = body;

    if (!key) return NextResponse.json({ error: "Setting key required" }, { status: 400 });

    // Use INSERT ... ON DUPLICATE KEY UPDATE for upsert
    await pool.query(
      `INSERT INTO site_settings (setting_key, setting_value) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE setting_value = ?`,
      [key, value || "", value || ""]
    );

    return NextResponse.json({ success: true, message: "Setting updated" }, { status: 200 });
  } catch (error: any) {
    console.error("Update Setting Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await checkAdminRole([1]); // Admin only
    if (!auth.authorized) return auth.response;

    const settings = await req.json();
    
    // Update each setting
    const queries = Object.entries(settings).map(([key, value]) => {
      return pool.query(
        `INSERT INTO site_settings (setting_key, setting_value) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE setting_value = ?`,
        [key, String(value), String(value)]
      );
    });

    await Promise.all(queries);

    return NextResponse.json({ success: true, message: "Settings updated successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Bulk Update Settings Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await checkAdminRole([1]); // Admin only
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { key } = body;

    if (!key) return NextResponse.json({ error: "Setting key required" }, { status: 400 });

    await pool.query("DELETE FROM site_settings WHERE setting_key = ?", [key]);

    return NextResponse.json({ success: true, message: "Setting deleted" }, { status: 200 });
  } catch (error: any) {
    console.error("Delete Setting Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
