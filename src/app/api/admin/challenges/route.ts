import { NextResponse } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { hashFlag } from "@/lib/flagUtils";

export async function GET(req: Request) {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response!;

    const [challenges] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, 
              COALESCE(
                (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', cf.id, 'flag', cf.flag, 'is_case_insensitive', cf.is_case_insensitive, 'allow_variations', cf.allow_variations)) 
                 FROM challenge_flags cf WHERE cf.challenge_id = c.id),
                JSON_ARRAY()
              ) as flags,
              COALESCE(
                (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', cu.id, 'url', cu.url, 'display_name', cu.display_name)) 
                 FROM challenge_urls cu WHERE cu.challenge_id = c.id),
                JSON_ARRAY()
              ) as urls
       FROM challenges c ORDER BY c.id DESC`
    );

    return NextResponse.json({ challenges }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response!;

    const userId = auth.userId!;

    const body = await req.json();
    const { 
      module_id, title, description, max_points, min_points, decay_limit, 
      is_premium, difficulty_level, prerequisite_id, flags, urls 
    } = body;

    if (!title || !module_id || !flags || flags.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Use the first flag for the primary flag field (for backwards compatibility)
    const primaryFlag = flags[0].flag;
    const flagHash = await hashFlag(primaryFlag);

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO challenges (module_id, title, description, flag, flag_hash, max_points, min_points, decay_limit, is_premium, difficulty_level, instructor_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        module_id,
        title,
        description || "",
        primaryFlag,
        flagHash,
        max_points || 500,
        min_points || 50,
        decay_limit || 50,
        is_premium || false,
        difficulty_level || "medium",
        userId,
      ]
    );

    const challengeId = result.insertId;

    // Insert additional flags
    for (let i = 1; i < flags.length; i++) {
      const flag = flags[i];
      const additionalFlagHash = await hashFlag(flag.flag);
      await pool.query(
        `INSERT INTO challenge_flags (challenge_id, flag, flag_hash, is_case_insensitive, allow_variations)
         VALUES (?, ?, ?, ?, ?)`,
        [challengeId, flag.flag, additionalFlagHash, flag.is_case_insensitive || false, flag.allow_variations || false]
      );
    }

    // Insert the first flag in challenge_flags table too
    await pool.query(
      `INSERT INTO challenge_flags (challenge_id, flag, flag_hash, is_case_insensitive, allow_variations)
       VALUES (?, ?, ?, ?, ?)`,
      [challengeId, primaryFlag, flagHash, flags[0].is_case_insensitive || false, flags[0].allow_variations || false]
    );

    // Insert URLs if provided
    if (urls && urls.length > 0) {
      for (const url of urls) {
        await pool.query(
          `INSERT INTO challenge_urls (challenge_id, url, display_name)
           VALUES (?, ?, ?)`,
          [challengeId, url.url, url.display_name || "Resource"]
        );
      }
    }


    // Fetch updated challenges list
    const [challenges] = await pool.query<RowDataPacket[]>(
      `SELECT id, module_id, title, description, flag, max_points, min_points, 
              decay_limit, solve_count, current_points, is_premium, difficulty_level 
       FROM challenges ORDER BY id DESC`
    );

    // Send notification to all users about new challenge
    const challengeNotif = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, target_audience, created_at)
       VALUES (NULL, 'challenge_update', 'New Challenge Added', ?, 'all_users', NOW())`,
      [`New challenge "${title}" has been added. Check the challenges page to test your skills!`]
    );
    console.log("Challenge creation notification sent:", challengeNotif);

    return NextResponse.json(
      { success: true, message: "Challenge created", challenges },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { 
      challengeId, module_id, title, description, max_points, min_points, decay_limit, 
      is_premium, difficulty_level, prerequisite_id, flags, urls 
    } = body;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      await connection.query(
        `UPDATE challenges SET module_id=?, title=?, description=?, max_points=?, min_points=?, decay_limit=?, is_premium=?, difficulty_level=?, prerequisite_id=? WHERE id=?`, 
        [module_id, title, description, max_points, min_points, decay_limit, is_premium, difficulty_level, prerequisite_id, challengeId]
      );
      
      await connection.query("DELETE FROM challenge_flags WHERE challenge_id = ?", [challengeId]);
      
      if (flags && Array.isArray(flags)) {
        for (const f of flags) {
          const flagHash = await hashFlag(f.flag);
          await connection.query(
            "INSERT INTO challenge_flags (challenge_id, flag, flag_hash, is_case_insensitive, allow_variations) VALUES (?, ?, ?, ?, ?)", 
            [challengeId, f.flag, flagHash, f.is_case_insensitive || false, f.allow_variations || false]
          );
        }
      }
      
      await connection.query("DELETE FROM challenge_urls WHERE challenge_id = ?", [challengeId]);
      if (urls && Array.isArray(urls)) {
        for (const u of urls) {
          await connection.query(
            "INSERT INTO challenge_urls (challenge_id, url, display_name) VALUES (?, ?, ?)", 
            [challengeId, u.url, u.display_name]
          );
        }
      }
      
      await connection.commit();
      connection.release();
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }

    // Send notification to all users about challenge update
    const challengeTitle = title || "Challenge";
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, target_audience, created_at)
       VALUES (NULL, 'challenge_update', 'Challenge Updated', ?, 'all_users', NOW())`,
      [`Challenge "${challengeTitle}" has been updated. Check the challenges page for details.`]
    ).catch(err => console.error("Failed to send update notification:", err));

    // Fetch updated challenges list
    const [challenges] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, 
              COALESCE(
                (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', cf.id, 'flag', cf.flag, 'is_case_insensitive', cf.is_case_insensitive, 'allow_variations', cf.allow_variations)) 
                 FROM challenge_flags cf WHERE cf.challenge_id = c.id),
                JSON_ARRAY()
              ) as flags,
              COALESCE(
                (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', cu.id, 'url', cu.url, 'display_name', cu.display_name)) 
                 FROM challenge_urls cu WHERE cu.challenge_id = c.id),
                JSON_ARRAY()
              ) as urls
       FROM challenges c ORDER BY c.id DESC`
    );

    return NextResponse.json(
      { success: true, message: "Challenge updated", challenges },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Update Challenge Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
    try {
      const auth = await checkAdminRole([1, 2]);
      if (!auth.authorized) return auth.response!;

      const body = await req.json();
      const { challengeId } = body;
      await pool.query("DELETE FROM challenges WHERE id = ?", [challengeId]);
      return NextResponse.json({ success: true, message: "Challenge deleted" });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
