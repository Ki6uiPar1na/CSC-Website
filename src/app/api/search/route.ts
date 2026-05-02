import { NextRequest, NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export async function GET(req: NextRequest) {
  try {
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
    const [resources] = await pool.query<RowDataPacket[]>(
      `SELECT id, title, category as subtitle, description, 'resource' as type, '/resources' as link 
       FROM resources 
       WHERE title LIKE ? OR description LIKE ?`,
      [searchTerm, searchTerm]
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
