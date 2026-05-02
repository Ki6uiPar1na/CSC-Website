import { NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user && "id" in session.user ? parseInt((session.user as any).id) : null;

    const modules = await withCache(
      CACHE_KEYS.MODULES,
      async () => {
        const [result] = await pool.query<RowDataPacket[]>(
          `SELECT id, title as name, description, is_premium 
           FROM modules 
           ORDER BY created_at DESC`
        );
        return result;
      },
      CACHE_TTL.LONG
    );

    // Check module completion status if user is logged in
    if (userId) {
      for (const mod of modules) {
        // Cache module completion per user
        const isCompleted = await withCache(
          `${CACHE_KEYS.MODULE_DETAIL}:completion`,
          async () => {
            const [challenges] = await pool.query<RowDataPacket[]>(
              "SELECT id FROM challenges WHERE module_id = ?",
              [mod.id]
            );
            const [solves] = await pool.query<RowDataPacket[]>(
              `SELECT challenge_id FROM solves 
               WHERE user_id = ? AND challenge_id IN (SELECT id FROM challenges WHERE module_id = ?)`,
              [userId, mod.id]
            );
            return challenges.length > 0 && challenges.length === solves.length;
          },
          CACHE_TTL.MEDIUM,
          { moduleId: mod.id, userId },
          userId
        );
        (mod as any).completed = isCompleted;
      }
    }

    return NextResponse.json(modules);
  } catch (error: any) {
    console.error("Modules API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
