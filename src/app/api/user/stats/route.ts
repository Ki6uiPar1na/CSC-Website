import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SolveModel } from "@/models/SolveModel";
import { ScoringModel } from "@/models/ScoringModel";
import { UserModel } from "@/models/UserModel";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt((session.user as any).id);
    
    const solves = await SolveModel.getAllUserSolves(userId);
    const moduleStatus = await ScoringModel.getUserModuleStatus(userId);
    const user = await UserModel.findByUsername(session.user.name!);

    const [premiumRows] = await pool.query<RowDataPacket[]>(
      `SELECT 1 FROM upgrade_code_usage u 
       JOIN upgrade_codes c ON u.upgrade_code_id = c.id 
       WHERE u.user_id = ? AND c.is_active = TRUE LIMIT 1`,
      [userId]
    );
    const isPremium = premiumRows.length > 0;

    return NextResponse.json({
      solves: solves.map(s => ({ solved_at: s.solved_at, challenge_id: s.challenge_id })),
      moduleStatus,
      totalPoints: user?.total_points || 0,
      streak: user?.current_streak || 0,
      isPremium: isPremium,
      subscription_expires_at: user?.subscription_expires_at || null
    });
  } catch (error: any) {
    console.error("Stats API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
