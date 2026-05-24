import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = "id" in session.user ? parseInt((session.user as any).id) : null;
    if (!userId) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    // Check if user is admin
    const [userRows] = await pool.query<RowDataPacket[]>(
      `SELECT role_id FROM users WHERE id = ?`,
      [userId]
    );

    if (userRows.length === 0 || userRows[0].role_id !== 1) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { 
      quantity = 1, 
      validity_months = 1, 
      expires_in_days = 30, 
      custom_code, 
      is_reusable = false,
      usage_limit = 1
    } = body;

    // A code is reusable if usage_limit > 1
    const effective_is_reusable = is_reusable || usage_limit > 1;

    // Handle custom code
    if (custom_code) {
      if (custom_code.length < 3) {
        return NextResponse.json({ error: "Custom code must be at least 3 characters" }, { status: 400 });
      }

      if (validity_months < 1 || validity_months > 120) {
        return NextResponse.json({ error: "Validity months must be between 1 and 120" }, { status: 400 });
      }

      const expiresAt = expires_in_days
        ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString().slice(0, 19)
        : null;

      try {
        await pool.query(
          `INSERT INTO upgrade_codes (code, validity_months, created_by_admin_id, expires_at, is_reusable, usage_limit, is_custom) 
           VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
          [custom_code.toUpperCase(), validity_months, userId, expiresAt, effective_is_reusable, usage_limit]
        );
      } catch (error: any) {
        if (error.code === "ER_DUP_ENTRY") {
          return NextResponse.json({ error: "This code already exists" }, { status: 400 });
        }
        throw error;
      }

      // Fetch updated codes and stats (only active codes)
      const [allCodes] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM upgrade_codes WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 50`
      );

      const [stats] = await pool.query<RowDataPacket[]>(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_used = FALSE AND (usage_limit = 1 OR usage_count < usage_limit) THEN 1 END) as unused,
          COUNT(CASE WHEN is_used = TRUE OR (usage_limit > 1 AND usage_count >= usage_limit) THEN 1 END) as used
         FROM upgrade_codes WHERE is_active = TRUE`
      );

      return NextResponse.json(
        {
          success: true,
          message: "Custom code added successfully",
          codes: allCodes,
          stats: stats[0],
        },
        { status: 201 }
      );
    }

    // Handle bulk code generation
    const quantity_int = parseInt(String(quantity));
    if (quantity_int < 1 || quantity_int > 100) {
      return NextResponse.json({ error: "Quantity must be between 1 and 100" }, { status: 400 });
    }

    // Generate upgrade codes
    const codes = [];
    const generatedCodes = [];

    for (let i = 0; i < quantity_int; i++) {
      // Generate a random code (e.g., CSC-ABC123XYZ)
      const randomPart = crypto.randomBytes(6).toString("hex").toUpperCase();
      const code = `CSC-${randomPart}`;

      codes.push(code);
      generatedCodes.push({
        code,
        validity_months,
        createdByAdminId: userId,
        expiresAt: expires_in_days ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000) : null,
        usage_limit: usage_limit,
        is_reusable: effective_is_reusable
      });
    }

    // Bulk insert codes
    const values = generatedCodes.map(
      (c) => `('${c.code}', ${c.validity_months}, ${userId}, ${c.expiresAt ? `'${c.expiresAt.toISOString().slice(0, 19)}'` : 'NULL'}, ${c.is_reusable ? 1 : 0}, ${c.usage_limit})`
    );

    await pool.query(
      `INSERT INTO upgrade_codes (code, validity_months, created_by_admin_id, expires_at, is_reusable, usage_limit) 
       VALUES ${values.join(",")}`
    );

    return NextResponse.json(
      {
        success: true,
        message: `${quantity_int} upgrade code(s) generated successfully`,
        codes: generatedCodes,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Generate Upgrade Codes Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate codes" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = "id" in session.user ? parseInt((session.user as any).id) : null;
    if (!userId) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const [userRows] = await pool.query<RowDataPacket[]>(
      `SELECT role_id FROM users WHERE id = ?`,
      [userId]
    );

    if (userRows.length === 0 || userRows[0].role_id !== 1) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const offset = (page - 1) * limit;

    let whereClause = "WHERE is_active = TRUE";
    const countParams: any[] = [];

    if (status === "unused") {
      whereClause += ` AND (is_used = FALSE AND (usage_limit = 1 OR usage_count < usage_limit))`;
    } else if (status === "used") {
      whereClause += ` AND (is_used = TRUE OR (usage_limit > 1 AND usage_count >= usage_limit))`;
    }

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM upgrade_codes ${whereClause}`,
      countParams
    );
    const total = (countResult[0] as any).total;

    const [codes] = await pool.query<RowDataPacket[]>(
      `SELECT id, code, validity_months, created_by_admin_id, created_at, expires_at, is_used, used_by_user_id, used_at, is_reusable, is_active, deleted_at, usage_limit, usage_count, is_custom 
       FROM upgrade_codes ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...countParams, limit, offset]
    );

    const [countStats] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_used = FALSE AND (usage_limit = 1 OR usage_count < usage_limit) THEN 1 ELSE 0 END) as unused,
        SUM(CASE WHEN is_used = TRUE OR (usage_limit > 1 AND usage_count >= usage_limit) THEN 1 ELSE 0 END) as used
       FROM upgrade_codes WHERE is_active = TRUE`
    );

    return NextResponse.json({
      codes,
      stats: countStats[0],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }, { status: 200 });
  } catch (error: any) {
    console.error("Get Upgrade Codes Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch codes" },
      { status: 500 }
    );
  }
}
