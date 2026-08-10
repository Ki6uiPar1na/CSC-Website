import { NextRequest, NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user && "id" in session.user ? parseInt((session.user as any).id) : null;
    const userRole = session?.user && "role" in session.user ? (session.user as any).role : null;

    // Check viewer premium status via upgrade codes
    let isPremium = false;
    if (userId) {
      const [premiumRows] = await pool.query<RowDataPacket[]>(
        `SELECT 1 FROM upgrade_code_usage u 
         JOIN upgrade_codes c ON u.upgrade_code_id = c.id 
         WHERE u.user_id = ? AND c.is_active = TRUE LIMIT 1`,
        [userId]
      );
      isPremium = premiumRows.length > 0;
    }
    const isAdmin = userRole === 1;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    const searchTerm = `%${query}%`;

    // 1. Search Achievements
    const [achievements] = await pool.query<RowDataPacket[]>(
      `SELECT id, competition_name as title, team_name as subtitle, description, 'achievement' as type, '/achievements' as link 
       FROM competition_achievements 
       WHERE competition_name LIKE ? OR team_name LIKE ? OR team_members LIKE ? OR description LIKE ?`,
      [searchTerm, searchTerm, searchTerm, searchTerm]
    );

    // 2. Search Events
    const [events] = await pool.query<RowDataPacket[]>(
      `SELECT id, title, type as subtitle, description, 'event' as type, CONCAT('/events/', slug) as link 
       FROM events 
       WHERE title LIKE ? OR description LIKE ?`,
      [searchTerm, searchTerm]
    );

    // 3. Search Challenges
    const [challenges] = await pool.query<RowDataPacket[]>(
      `SELECT id, title, difficulty_level as subtitle, description, 'challenge' as type, '/challenges' as link 
       FROM challenges 
       WHERE title LIKE ? OR description LIKE ?`,
      [searchTerm, searchTerm]
    );

    // 4. Search Resources
    let resourceQuery = `SELECT id, title, category as subtitle, description, 'resource' as type, '/resources' as link 
       FROM resources 
       WHERE (title LIKE ? OR description LIKE ?)`;
    const resourceParams = [searchTerm, searchTerm];
    if (!isPremium && !isAdmin) {
      resourceQuery += " AND is_premium = 0";
    }
    const [resources] = await pool.query<RowDataPacket[]>(
      resourceQuery,
      resourceParams
    );

    const allResults = [
      ...achievements,
      ...events,
      ...challenges,
      ...resources
    ];

    return NextResponse.json({ results: allResults });
  } catch (error) {
    console.error("Global search error:", error);
    return NextResponse.json({ error: "Failed to perform search" }, { status: 500 });
  }
}
