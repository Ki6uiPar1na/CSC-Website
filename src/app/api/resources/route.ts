import { NextResponse, NextRequest } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { enforceRateLimit } from "@/lib/rateLimitMiddleware";

export async function GET(req: NextRequest) {
  try {
    const { allowed, response: rateLimitResponse } = await enforceRateLimit(
      req,
      "GET_RESOURCES"
    );

    if (!allowed) {
      return rateLimitResponse!;
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user && "id" in session.user ? parseInt((session.user as any).id) : null;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const category = searchParams.get("category");
    const offset = (page - 1) * limit;

    const categoryFilter = category ? "WHERE category = ?" : "";
    const queryParams = category ? [category, limit, offset] : [limit, offset];

    const countParams = category ? [category] : [];
    const [totalResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM resources ${categoryFilter}`,
      countParams
    );
    const total = (totalResult[0] as any).total;

    const rows = await withCache(
      CACHE_KEYS.RESOURCES,
      async () => {
        const [result] = await pool.query<RowDataPacket[]>(
          `SELECT r.id, r.title, r.description, r.url, r.category, r.action, r.is_external,
                  ru.url as extra_url, ru.display_name as extra_display_name
           FROM resources r
           LEFT JOIN resource_urls ru ON r.id = ru.resource_id
           ${categoryFilter}
           ORDER BY r.created_at DESC
           LIMIT ? OFFSET ?`,
          queryParams
        );
        return result;
      },
      CACHE_TTL.VERY_LONG,
      { page, category }
    );

    const categories: { [key: string]: any } = {};
    
    rows.forEach(row => {
      const categoryName = row.category || "General";
      if (!categories[categoryName]) {
        categories[categoryName] = {
          name: categoryName,
          links: []
        };
      }

      let resource = categories[categoryName].links.find((l: any) => l.id === row.id);
      if (!resource) {
        resource = {
          id: row.id,
          name: row.title,
          url: row.url,
          description: row.description,
          action: row.action || "Read",
          is_completed: false,
          extraLinks: []
        };
        categories[categoryName].links.push(resource);
      }

      if (row.extra_url) {
        resource.extraLinks.push({
          url: row.extra_url,
          name: row.extra_display_name
        });
      }
    });

    // Mark completions for authenticated users
    if (userId) {
      const [completions] = await pool.query<RowDataPacket[]>(
        `SELECT resource_id FROM resource_completions WHERE user_id = ?`,
        [userId]
      );
      const completedIds = new Set(completions.map((c: any) => c.resource_id));
      for (const cat of Object.values(categories) as any[]) {
        for (const link of cat.links) {
          if (completedIds.has(link.id)) {
            link.is_completed = true;
          }
        }
      }
    }

    return NextResponse.json({
      categories: Object.values(categories),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }, { status: 200 });
  } catch (error: any) {
    console.error("Resources API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
